import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { questionBank } from '../data/questionBank';
import { updateBelief } from '../engine/bkt';
import { scoreSubjective, scoreStructured } from '../engine/rubric';
import { selectNextQuestion, isPhaseComplete } from '../engine/questionSelector';
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

        // 3. Load domain priors from personality
        const persData = await getDoc(doc(db, 'personality_responses', uid)).then(s => s.data());
        const priors = persData?.domainPriors ?? { dsa: 0.125, web_dev: 0.125, ml: 0.125, databases: 0.125, operating_systems: 0.125, networking: 0.125, system_design: 0.125, security: 0.125 };

        // 1. Load quiz session (or create if first time)
        let sessSnap = await getDoc(doc(db, 'quiz_sessions', uid));
        let sessData;
        let bktData;

        if (!sessSnap.exists()) {
          sessData = {
            uid, phase: 1,
            questionsAnswered: [],
            remedialTriggered: false,
            startedAt: new Date().toISOString(),
            lastUpdatedAt: new Date().toISOString(),
            completedAt: null,
          };
          await setDoc(doc(db, 'quiz_sessions', uid), sessData);
          
          bktData = {
            uid, 
            domainBeliefs: priors,
          };
          await setDoc(doc(db, 'bkt_beliefs', uid), bktData);
        } else {
          sessData = sessSnap.data();
          bktData = await getDoc(doc(db, 'bkt_beliefs', uid)).then(s => s.data());
        }

        setSession(sessData);
        setBktBeliefs(bktData);
        setPersonalityData(persData);
        setDomainPriors(priors);

        // 4. Select first question
        const nextQ = selectNextQuestion({ questionBank, session: sessData, domainBeliefs: bktData.domainBeliefs });
        
        if (!nextQ) {
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
    setUserAnswer(type === 'mcq' ? null : '');
  };

  const handlePhaseCompleteOrNull = async (currentSession, currentBkt, currentPriors, currentPersData) => {
    const uid = auth.currentUser.uid;

    if (currentSession.phase >= 3) {
      // Stage 2 complete, transition to Stage 3 (GitHub + LLM deep validation)
      await updateDoc(doc(db, 'users', uid), {
        assessmentStatus: 'in_progress',
        quizComplete: true,
        stage3Complete: false,
        currentPhase: 4,
      });
      await setDoc(
        doc(db, 'stage3_sessions', uid),
        {
          uid,
          stage2CompletedAt: new Date().toISOString(),
          domainBeliefsBeforeStage3: currentBkt?.domainBeliefs || {},
        },
        { merge: true }
      );
      navigate('/quiz/stage3');
      return;
    }

    // Advance phase
    const nextPhase = currentSession.phase + 1;
    const updatedSession = { ...currentSession, phase: nextPhase, lastUpdatedAt: new Date().toISOString() };
    setSession(updatedSession);

    await updateDoc(doc(db, 'quiz_sessions', uid), {
      phase: updatedSession.phase,
      lastUpdatedAt: updatedSession.lastUpdatedAt,
    });
    await updateDoc(doc(db, 'users', uid), { currentPhase: updatedSession.phase });

    // Try finding next question in new phase
    setTransitionState({ phase: updatedSession.phase });
    
    setTimeout(() => {
      setTransitionState(null);
      const nextQ = selectNextQuestion({ questionBank, session: updatedSession, domainBeliefs: currentBkt.domainBeliefs });
      if (!nextQ) {
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
      if (currentQuestion.type === 'mcq') {
        const isCorrect = userAnswer === currentQuestion.answer;
        evaluation = {
          score: isCorrect ? 1.0 : 0.0, isCorrect,
          conceptsMatched: isCorrect ? [currentQuestion.concept] : [],
          conceptsMissed: isCorrect ? [] : [currentQuestion.concept],
        };
      } else if (currentQuestion.type === 'short') {
        evaluation = await scoreSubjective(
          userAnswer,
          currentQuestion.expectedPoints || [],
          currentQuestion.text || ''
        );
      } else {
        evaluation = await scoreStructured(
          userAnswer,
          currentQuestion.expectedPoints || [],
          currentQuestion.text || ''
        );
      }

      // 2. BKT update
      const currentBelief = bktBeliefs.domainBeliefs[currentQuestion.domain] || 0.5;
      const updatedBelief = updateBelief(currentBelief, evaluation.isCorrect);

      // 3. Update local state
      const newBktBeliefs = {...bktBeliefs};
      if (!newBktBeliefs.domainBeliefs) newBktBeliefs.domainBeliefs = {};
      newBktBeliefs.domainBeliefs[currentQuestion.domain] = updatedBelief;
      setBktBeliefs(newBktBeliefs);

      const newSession = {...session};
      newSession.questionsAnswered.push(currentQuestion.questionId);
      setSession(newSession);

      // 4. Firestore writes (all three in parallel)
      await Promise.all([
        setDoc(doc(db, 'quiz_responses', uid, 'answers', currentQuestion.questionId), {
          questionId: currentQuestion.questionId,
          domain: currentQuestion.domain,
          type: currentQuestion.type,
          phase: newSession.phase,
          answerIndex: currentQuestion.type === 'mcq' ? userAnswer : null,
          answerText: currentQuestion.type === 'short' ? userAnswer : null,
          answerStructured: currentQuestion.type === 'long' ? userAnswer : null,
          isCorrect: evaluation.isCorrect,
          evaluationScore: evaluation.score,
          waAttributes: currentQuestion.waAttributes || [],
          bloom: currentQuestion.bloom || 1,
          answeredAt: new Date().toISOString(),
        }),
        updateDoc(doc(db, 'bkt_beliefs', uid), {
          [`domainBeliefs.${currentQuestion.domain}`]: updatedBelief,
        }),
        updateDoc(doc(db, 'quiz_sessions', uid), {
          questionsAnswered: arrayUnion(currentQuestion.questionId),
          lastUpdatedAt: new Date().toISOString(),
        }),
      ]);

      // 5. Check phase completion
      if (isPhaseComplete(newSession.phase, newSession.questionsAnswered, questionBank)) {
         await handlePhaseCompleteOrNull(newSession, newBktBeliefs, domainPriors, personalityData);
      } else {
        // 6. Load next question
        const next = selectNextQuestion({ questionBank, session: newSession, domainBeliefs: newBktBeliefs.domainBeliefs });
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
    if (currentQuestion.type === 'mcq') return userAnswer === null;
    if (currentQuestion.type === 'short' || currentQuestion.type === 'long') return !userAnswer || userAnswer.trim() === '';
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
          Transitioning to deeper cognition levels...
        </p>
      </div>
    );
  }

  if (!currentQuestion) {
    return <div className="min-h-screen flex items-center justify-center">Processing...</div>;
  }

  const domainLabel = (currentQuestion.domain || 'general').replace('_', ' ');
  const conceptLabel = (currentQuestion.concept || 'general').replace('_', ' ');

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
          <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-1 rounded capitalize">
            {domainLabel}
          </span>
          <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded">
            {conceptLabel}
          </span>
          <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-1 rounded">
            Bloom: {currentQuestion.bloom}
          </span>
          {currentQuestion.waAttributes?.map((wa, idx) => (
            <span key={idx} className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2.5 py-1 rounded">
              {wa}
            </span>
          ))}
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-8 leading-relaxed">
          {currentQuestion.text}
        </h2>

        <div className="space-y-4 mb-8">
          {currentQuestion.type === 'mcq' && (
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

          {(currentQuestion.type === 'short' || currentQuestion.type === 'long') && (
            <div>
              <textarea
                rows={currentQuestion.type === 'long' ? "12" : "5"}
                placeholder={currentQuestion.type === 'long' ? "Type your detailed answer here..." : "Type your answer here..."}
                value={userAnswer || ''}
                onChange={(e) => setUserAnswer(e.target.value)}
                className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              ></textarea>
              <div className="text-right text-xs text-gray-500 mt-2">
                Words: {(userAnswer?.trim()?.split(/\s+/).filter(w=>w.length>0) || []).length}
              </div>
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
