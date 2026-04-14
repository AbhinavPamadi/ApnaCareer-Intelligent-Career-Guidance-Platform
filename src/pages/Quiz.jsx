import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, arrayUnion } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { questionBank } from '../data/questionBank';
import { updateBelief, P_INIT } from '../engine/bkt';
import { scoreSubjective, scoreStructured } from '../engine/rubric';
import { selectNextQuestion, checkPhaseTransition, isPhaseComplete } from '../engine/questionSelector';
import { generateResults } from '../engine/resultGenerator';
import { useToast } from '../components/ToastContext';

export default function Quiz() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState(null);
  const [bktBeliefs, setBktBeliefs] = useState(null);
  const [personalityData, setPersonalityData] = useState(null);
  const [domainPriors, setDomainPriors] = useState(null);
  
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [userAnswer, setUserAnswer] = useState(null);
  
  const [transitionState, setTransitionState] = useState(null); // { phase, activeDomains }
  const [remedialState, setRemedialState] = useState(false);
  const [error, setError] = useState(null);
  const addToast = useToast();

  useEffect(() => {
    async function loadQuiz() {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate('/auth');
          return;
        }
        
        const uid = user.uid;

        // 1. Load quiz session (or create if first time)
        let sessSnap = await getDoc(doc(db, 'quiz_sessions', uid));
        let sessData;
        let bktData;

        if (!sessSnap.exists()) {
          sessData = {
            uid, phase: 1,
            activeDomains: ['DSA', 'WebDev', 'ML', 'Systems'],
            eliminatedDomains: [], bestDomain: null,
            questionsAnswered: [],
            domainScores: { DSA: 0, WebDev: 0, ML: 0, Systems: 0 },
            remedialTriggered: false,
            startedAt: new Date().toISOString(),
            lastUpdatedAt: new Date().toISOString(),
            completedAt: null,
          };
          await setDoc(doc(db, 'quiz_sessions', uid), sessData);
          
          bktData = {
            uid, concepts: {},
            domainBeliefs: { DSA: 0, WebDev: 0, ML: 0, Systems: 0 },
            attributeBeliefs: { PO1: 0.5, PO2: 0.5, PO3: 0.5, PO4: 0.5, PO5: 0.5, PO8: 0.5 },
          };
          await setDoc(doc(db, 'bkt_beliefs', uid), bktData);
        } else {
          sessData = sessSnap.data();
          bktData = await getDoc(doc(db, 'bkt_beliefs', uid)).then(s => s.data());
        }

        // 3. Load domain priors from personality
        const persData = await getDoc(doc(db, 'personality_responses', uid)).then(s => s.data());
        const priors = persData?.domainPriors ?? { DSA: 0.4, WebDev: 0.4, ML: 0.4, Systems: 0.4 };

        setSession(sessData);
        setBktBeliefs(bktData);
        setPersonalityData(persData);
        setDomainPriors(priors);

        // 4. Select first question
        const nextQ = selectNextQuestion({ questionBank, session: sessData, bktBeliefs: bktData, domainPriors: priors });
        
        if (!nextQ) {
          // If no questions on mount, check if phase is complete or we just hit the end
          await handlePhaseCompleteOrNull(sessData, bktData, priors, persData);
        } else {
          setCurrentQuestion(nextQ);
          resetAnswerState(nextQ.type);
        }

      } catch (err) {
        console.error(err);
        setError('Failed to load quiz data.');
      } finally {
        setLoading(false);
      }
    }

    loadQuiz();
  }, [navigate]);

  const resetAnswerState = (type) => {
    if (type === 'SubjectiveStructured') {
      setUserAnswer({ problemUnderstanding: '', approach: '', tradeoffs: '', decision: '' });
    } else {
      setUserAnswer(type === 'MCQ' ? null : '');
    }
  };

  const handlePhaseCompleteOrNull = async (currentSession, currentBkt, currentPriors, currentPersData) => {
    const uid = auth.currentUser.uid;
    const transition = checkPhaseTransition(currentSession.phase, currentSession.activeDomains, currentBkt, currentPriors);

    if (transition.remedial) {
      await updateDoc(doc(db, 'quiz_sessions', uid), { remedialTriggered: true, completedAt: new Date().toISOString() });
      await updateDoc(doc(db, 'users', uid), { assessmentStatus: 'remedial', quizComplete: true });
      setRemedialState(true);
      return;
    }

    if (transition.newPhase === 8) {
      // Generate and save results
      setSubmitting(true);
      const answersSnap = await getDocs(collection(db, 'quiz_responses', uid, 'answers'));
      const answeredQuestions = answersSnap.docs.map(d => d.data());
      const results = generateResults({ bktBeliefs: currentBkt, personalityData: currentPersData, session: currentSession, questionBank, answeredQuestions });
      await setDoc(doc(db, 'results', uid), { ...results, generatedAt: new Date().toISOString() });
      await updateDoc(doc(db, 'users', uid), { assessmentStatus: 'complete', quizComplete: true });
      navigate('/results');
      return;
    }

    // Advance phase
    const nextPhase = transition.newPhase || currentSession.phase + 1; // Fallback if stuck
    const nextActive = transition.newActiveDomains || currentSession.activeDomains;
    const nextEliminated = ['DSA', 'WebDev', 'ML', 'Systems'].filter(d => !nextActive.includes(d));

    const updatedSession = { ...currentSession, phase: nextPhase, activeDomains: nextActive, eliminatedDomains: nextEliminated, lastUpdatedAt: new Date().toISOString() };
    setSession(updatedSession);

    await updateDoc(doc(db, 'quiz_sessions', uid), {
      phase: updatedSession.phase,
      activeDomains: updatedSession.activeDomains,
      eliminatedDomains: updatedSession.eliminatedDomains,
      lastUpdatedAt: updatedSession.lastUpdatedAt,
    });
    await updateDoc(doc(db, 'users', uid), { currentPhase: updatedSession.phase });

    // Try finding next question in new phase
    setTransitionState({ phase: updatedSession.phase, activeDomains: updatedSession.activeDomains });
    
    setTimeout(() => {
      setTransitionState(null);
      const nextQ = selectNextQuestion({ questionBank, session: updatedSession, bktBeliefs: currentBkt, domainPriors: currentPriors });
      if (!nextQ) {
         // Rare case: even new phase has no questions available immediately. Recursively check.
         handlePhaseCompleteOrNull(updatedSession, currentBkt, currentPriors, currentPersData);
      } else {
        setCurrentQuestion(nextQ);
        resetAnswerState(nextQ.type);
      }
    }, 2000);
  };

  const handleSubmit = async () => {
    if (submitting || !currentQuestion) return;
    setSubmitting(true);
    const uid = auth.currentUser.uid;

    try {
      // 1. Evaluate
      let evaluation;
      if (currentQuestion.type === 'MCQ') {
        const isCorrect = userAnswer === currentQuestion.correctIndex;
        evaluation = {
          score: isCorrect ? 1.0 : 0.0, isCorrect,
          conceptsMatched: isCorrect ? [currentQuestion.concept] : [],
          conceptsMissed: isCorrect ? [] : [currentQuestion.concept],
        };
      } else if (currentQuestion.type === 'Subjective') {
        evaluation = scoreSubjective(userAnswer, currentQuestion.rubric);
      } else {
        evaluation = scoreStructured(userAnswer, currentQuestion.rubric);
      }

      // 2. BKT update
      if (!bktBeliefs.concepts) bktBeliefs.concepts = {};
      const prevBelief = bktBeliefs.concepts[currentQuestion.concept]?.belief ?? P_INIT;
      const updatedBelief = updateBelief(prevBelief, evaluation.isCorrect);

      // 3. Update local state
      const updatedConceptData = {
        domain: currentQuestion.domain,
        belief: updatedBelief,
        questionsAsked: (bktBeliefs.concepts[currentQuestion.concept]?.questionsAsked ?? 0) + 1,
        lastUpdated: new Date().toISOString(),
      };
      
      const newBktBeliefs = {...bktBeliefs};
      newBktBeliefs.concepts[currentQuestion.concept] = updatedConceptData;
      setBktBeliefs(newBktBeliefs);

      const newSession = {...session};
      newSession.questionsAnswered.push(currentQuestion.questionId);
      setSession(newSession);

      // 4. Firestore writes (all three in parallel)
      await Promise.all([
        setDoc(doc(db, 'quiz_responses', uid, 'answers', currentQuestion.questionId), {
          questionId: currentQuestion.questionId,
          domain: currentQuestion.domain,
          concept: currentQuestion.concept,
          bloomLevel: currentQuestion.bloomLevel,
          type: currentQuestion.type,
          phase: newSession.phase,
          answerIndex: currentQuestion.type === 'MCQ' ? userAnswer : null,
          answerText: currentQuestion.type === 'Subjective' ? userAnswer : null,
          answerStructured: currentQuestion.type === 'SubjectiveStructured' ? userAnswer : null,
          isCorrect: evaluation.isCorrect,
          evaluationScore: evaluation.score,
          conceptsMatched: evaluation.conceptsMatched,
          conceptsMissed: evaluation.conceptsMissed,
          answeredAt: new Date().toISOString(),
          skillAttribute: currentQuestion.skillAttribute,
          waAttributes: currentQuestion.waAttributes,
        }),
        updateDoc(doc(db, 'bkt_beliefs', uid), {
          [`concepts.${currentQuestion.concept}`]: updatedConceptData,
        }),
        updateDoc(doc(db, 'quiz_sessions', uid), {
          questionsAnswered: arrayUnion(currentQuestion.questionId),
          lastUpdatedAt: new Date().toISOString(),
        }),
      ]);

      // 5. Check phase completion
      if (isPhaseComplete(newSession.phase, newSession.activeDomains, newBktBeliefs, questionBank, newSession.questionsAnswered)) {
         await handlePhaseCompleteOrNull(newSession, newBktBeliefs, domainPriors, personalityData);
      } else {
        // 6. Load next question
        const next = selectNextQuestion({ questionBank, session: newSession, bktBeliefs: newBktBeliefs, domainPriors });
        if (!next) {
          await handlePhaseCompleteOrNull(newSession, newBktBeliefs, domainPriors, personalityData);
        } else {
          setCurrentQuestion(next);
          resetAnswerState(next.type);
        }
      }

    } catch (err) {
      console.error(err);
      addToast('Something went wrong. Your progress is saved. Please try again.', 'error');
    } finally {
      if(!transitionState && !remedialState) {
        setSubmitting(false);
      }
    }
  };

  const isSubmitDisabled = () => {
    if (!currentQuestion) return true;
    if (currentQuestion.type === 'MCQ') return userAnswer === null;
    if (currentQuestion.type === 'Subjective') return !userAnswer || userAnswer.trim() === '';
    if (currentQuestion.type === 'SubjectiveStructured') {
      return !userAnswer.problemUnderstanding?.trim() || 
             !userAnswer.approach?.trim() || 
             !userAnswer.tradeoffs?.trim() || 
             !userAnswer.decision?.trim();
    }
    return true;
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading Quiz...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
  }

  if (remedialState) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow p-8 max-w-lg text-center border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Assessment Paused</h2>
          <p className="text-gray-600 mb-6">
            We noticed you're struggling with foundational concepts across domains. 
            Don't worry — we've prepared a customized remedial track to help strengthen your fundamental skills before tackling higher-level abstractions!
          </p>
          <button 
            onClick={() => navigate('/results')}
            className="bg-blue-600 text-white font-bold px-6 py-3 rounded-full hover:bg-blue-700 transition"
          >
            View Recommendations
          </button>
        </div>
      </div>
    );
  }

  if (transitionState) {
    return (
      <div className="min-h-screen bg-blue-600 flex flex-col items-center justify-center text-white p-4">
        <h1 className="text-5xl font-extrabold mb-4 animate-pulse">Phase {transitionState.phase}</h1>
        <p className="text-xl opacity-90 text-center max-w-xl">
          Transitioning to deeper cognition levels. 
          Focusing on: {transitionState.activeDomains.join(', ')}
        </p>
      </div>
    );
  }

  if (!currentQuestion) {
    return <div className="min-h-screen flex items-center justify-center">Processing...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-8 pb-12 px-4 sm:px-6">
      
      {/* Top Bar */}
      <div className="w-full max-w-3xl mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold text-gray-700">Phase {session?.phase}</span>
          <span className="text-gray-500 text-sm">Question {session?.questionsAnswered?.length + 1}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min(100, (session?.questionsAnswered?.length / 30) * 100)}%` }}></div>
        </div>
      </div>

      {/* Main Question Card */}
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
        
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-1 rounded">
            {currentQuestion.domain}
          </span>
          <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded">
            {currentQuestion.concept}
          </span>
          <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-1 rounded">
            {currentQuestion.bloomLevel}
          </span>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-8 leading-relaxed">
          {currentQuestion.text}
        </h2>

        <div className="space-y-4 mb-8">
          {currentQuestion.type === 'MCQ' && (
            <div className="grid grid-cols-1 gap-3">
              {currentQuestion.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => setUserAnswer(idx)}
                  className={`w-full text-left p-4 rounded-lg border transition ${
                    userAnswer === idx 
                      ? 'border-blue-600 bg-blue-50 text-blue-900' 
                      : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {currentQuestion.type === 'Subjective' && (
            <div>
              <textarea
                rows="6"
                placeholder="Type your answer here..."
                value={userAnswer || ''}
                onChange={(e) => setUserAnswer(e.target.value)}
                className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              ></textarea>
              <div className="text-right text-xs text-gray-500 mt-2">
                Words: {(userAnswer?.trim()?.split(/\s+/).filter(w=>w.length>0) || []).length}
                {currentQuestion.rubric?.minWordCount ? ` / Min ${currentQuestion.rubric?.minWordCount}` : ''}
              </div>
            </div>
          )}

          {currentQuestion.type === 'SubjectiveStructured' && (
            <div className="space-y-4">
              {['problemUnderstanding', 'approach', 'tradeoffs', 'decision'].map(section => (
                <div key={section}>
                  <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                    {section.replace(/([A-Z])/g, ' $1')}
                  </label>
                  <textarea
                    rows="3"
                    value={userAnswer?.[section] || ''}
                    onChange={(e) => setUserAnswer({...userAnswer, [section]: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  ></textarea>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitDisabled() || submitting}
          className="w-full bg-blue-600 text-white font-bold px-6 py-3 rounded-lg shadow hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Connecting...' : 'Submit Answer'}
        </button>
      </div>

    </div>
  );
}
