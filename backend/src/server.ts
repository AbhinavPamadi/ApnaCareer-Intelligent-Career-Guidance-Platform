import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { db } from './firebaseAdmin';
import { verifyAuth } from './middleware/auth';
import { mockQuestions, personalityQuestions } from './data/questions';
import { extractTraits, calculateDomainPriors } from './engine/personality';
import { selectNextQuestion } from './engine/adaptiveSelector';
import { evaluateMCQ } from './engine/evaluation';
import { updateBelief } from './engine/bkt';
import { rankAndNarrowDomains } from './engine/orchestrator';
import { generateProfile } from './engine/profiling';
import { generateRecommendations } from './engine/recommendation';
import { BeliefState, Domain, DomainPriors, PersonalityTraits, Question, QuizPhase } from './types';

const app = express();
app.use(cors());
app.use(express.json());

interface SessionState {
    userId: string;
    assessmentId: string;
    traits: PersonalityTraits | null;
    priors: DomainPriors;
    phase: QuizPhase;
    activeDomains: Domain[];
    askedQuestionIds: Set<string>;
    beliefs: BeliefState[];
    latestIsCorrect: boolean;
    lastQuestion: Question | null;
    currentQuestion: Question | null;
    phaseQCount: number;
}
const sessions: Record<string, SessionState> = {};
const QUESTIONS_PER_PHASE = 3;

app.post('/auth/register', async (req, res) => {
    // We can hook to record new user metadata manually here, or just let frontend hit it
    const { uid, email, name } = req.body;
    await db.collection('users').doc(uid).set({ uid, email, name, createdAt: new Date() }, { merge: true });
    res.json({ success: true });
});

app.get('/personality-questions', (req, res) => {
    res.json({ questions: personalityQuestions });
});

app.post('/personality', verifyAuth, async (req, res) => {
    const userId = (req as any).user.uid;
    const { answers } = req.body;
    if (!answers) return res.status(400).json({ error: 'Missing answers' });

    const traits = extractTraits(answers);
    const priors = calculateDomainPriors(traits);

    const assessmentId = uuidv4();

    sessions[userId] = {
        userId,
        assessmentId,
        traits,
        priors,
        phase: 'Screening',
        activeDomains: ['DSA', 'Web Development', 'Machine Learning', 'Systems'],
        askedQuestionIds: new Set(),
        beliefs: [],
        latestIsCorrect: false,
        lastQuestion: null,
        currentQuestion: null,
        phaseQCount: 0
    };

    // Sync personality to Firestore assessment doc
    await db.collection('assessments').doc(assessmentId).set({
        userId,
        personalityProfile: traits,
        createdAt: new Date()
    });

    res.json({ traits, priors });
});

app.post('/quiz/start', verifyAuth, async (req, res) => {
    const userId = (req as any).user.uid;
    const session = sessions[userId];
    if (!session) return res.status(404).json({ error: 'Session not found. Did you complete personality?' });

    const firstQ = selectNextQuestion(mockQuestions, {
        askedQuestionIds: session.askedQuestionIds,
        beliefs: session.beliefs,
        latestIsCorrect: session.latestIsCorrect,
        lastQuestion: session.lastQuestion,
        phase: session.phase,
        activeDomains: session.activeDomains
    });

    if (firstQ) {
        session.currentQuestion = firstQ;
        session.askedQuestionIds.add(firstQ.id);
    }

    res.json({ currentQuestion: firstQ, phase: session.phase });
});

app.post('/quiz/answer', verifyAuth, async (req, res) => {
    const userId = (req as any).user.uid;
    const { answer } = req.body;
    const session = sessions[userId];

    if (!session || !session.currentQuestion) return res.status(400).json({ error: 'Invalid session' });

    let isCorrect = session.currentQuestion.type === 'MCQ' ? evaluateMCQ(session.currentQuestion, answer) : answer.length > 10;

    // DB Store Response
    await db.collection('responses').add({
        userId,
        assessmentId: session.assessmentId,
        questionId: session.currentQuestion.id,
        answer,
        correctness: isCorrect,
        concept: session.currentQuestion.concept,
        domain: session.currentQuestion.domain,
        bloomLevel: session.currentQuestion.bloomLevel,
        timestamp: new Date()
    });

    // Belief updates
    const updateTargetBelief = async (target: string, type: 'Concept' | 'Domain' | 'Attribute') => {
        const existing = session.beliefs.find(b => b.concept === target);
        const priorProb = existing ? existing.probability : 0.5;
        const newProb = updateBelief(priorProb, isCorrect);

        // DB Store Beliefs
        await db.collection('beliefs').doc(`${userId}_${target}`).set({
            userId, concept: target, probability: newProb, updatedAt: new Date()
        });

        return { userId, concept: target, conceptType: type, probability: newProb };
    };

    const newBeliefs = session.beliefs.filter(b => b.concept !== session.currentQuestion!.concept && b.concept !== session.currentQuestion!.domain && b.concept !== session.currentQuestion!.attribute);
    const cBelief = await updateTargetBelief(session.currentQuestion.concept, 'Concept');
    const dBelief = await updateTargetBelief(session.currentQuestion.domain, 'Domain');
    const aBelief = await updateTargetBelief(session.currentQuestion.attribute, 'Attribute');

    session.beliefs = [...newBeliefs, cBelief, dBelief, aBelief] as BeliefState[];
    session.latestIsCorrect = isCorrect;
    session.lastQuestion = session.currentQuestion;
    session.phaseQCount += 1;

    if (session.phaseQCount >= QUESTIONS_PER_PHASE) {
        const { nextPhase, activeDomains } = rankAndNarrowDomains(session.beliefs, session.phase, ['DSA', 'Web Development', 'Machine Learning', 'Systems']);
        if (!nextPhase) {
            session.currentQuestion = null;
            return res.json({ finished: true });
        }
        session.phase = nextPhase;
        session.activeDomains = activeDomains;
        session.phaseQCount = 0;
    }

    const nextQ = selectNextQuestion(mockQuestions, {
        askedQuestionIds: session.askedQuestionIds, beliefs: session.beliefs,
        latestIsCorrect: session.latestIsCorrect, lastQuestion: session.lastQuestion,
        phase: session.phase, activeDomains: session.activeDomains
    });

    if (nextQ) {
        session.currentQuestion = nextQ;
        session.askedQuestionIds.add(nextQ.id);
        res.json({ currentQuestion: nextQ, phase: session.phase, finished: false });
    } else {
        session.currentQuestion = null;
        res.json({ finished: true });
    }
});

app.get('/quiz/result', verifyAuth, async (req, res) => {
    const userId = (req as any).user.uid;
    const session = sessions[userId];
    if (!session || !session.traits) return res.status(404).json({ error: 'Result not pending / complete' });

    const bestDomain = session.activeDomains[0] || null;
    const profile = generateProfile(userId, session.beliefs, session.traits, session.priors, bestDomain);
    const recommendations = generateRecommendations(profile);

    await db.collection('assessments').doc(session.assessmentId).update({
        domainScores: profile.domainScores,
        finalDomain: bestDomain,
        roleRecommendations: recommendations.recommendedRoles,
        skillGaps: recommendations.skillGaps,
        completedAt: new Date()
    });

    // Clear memory
    delete sessions[userId];
    res.json({ profile, recommendations });
});

app.get('/user/dashboard', verifyAuth, async (req, res) => {
    const userId = (req as any).user.uid;

    const snapshot = await db.collection('assessments').where('userId', '==', userId).orderBy('createdAt', 'desc').get();
    const assessments = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    const bSnapshot = await db.collection('beliefs').where('userId', '==', userId).get();
    const rawBeliefs = bSnapshot.docs.map((doc: any) => doc.data());

    const weakConcepts = rawBeliefs.filter((b: any) => b.probability < 0.5).map((b: any) => b.concept);

    res.json({
        recentAssessments: assessments,
        weakAreas: weakConcepts
    });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Secure Production Backend active on port ${PORT}`));
