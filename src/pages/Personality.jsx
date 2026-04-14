import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { personalityQuestions as rawQuestions } from '../data/personalityQuestions';
import { computePersonalityVector } from '../engine/personality';
import { useToast } from '../components/ToastContext';

export default function Personality() {
  const navigate = useNavigate();
  const addToast = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [personalityQuestions, setPersonalityQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userResponse, setUserResponse] = useState(null);

  useEffect(() => {
    async function loadPersonality() {
      try {
        const uid = auth.currentUser.uid;
        
        // Sort questions by order
        const sortedQuestions = [...rawQuestions].sort((a, b) => (a.order || 0) - (b.order || 0));
        setPersonalityQuestions(sortedQuestions);

        const snap = await getDoc(doc(db, 'personality_responses', uid));
        
        if (snap.exists()) {
          const data = snap.data();
          if (data.completedAt) {
            navigate('/dashboard');
            return;
          }
          const answered = data.responses || [];
          setCurrentIdx(answered.length);
        } else {
          // first time - create document
          await setDoc(doc(db, 'personality_responses', uid), { 
            uid, 
            responses: [] 
          });
          setCurrentIdx(0);
        }
      } catch (err) {
        addToast("Something went wrong loading your session. Please try again.", "error");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadPersonality();
  }, [navigate, addToast]);

  const handleSubmit = async () => {
    if (submitting || !userResponse) return;
    setSubmitting(true);
    
    const uid = auth.currentUser.uid;
    const currentQ = personalityQuestions[currentIdx];

    try {
      const responseObj = {
        questionId: currentQ.questionId,
        response: userResponse,
        answeredAt: new Date().toISOString(),
      };

      // Save each answer immediately
      await updateDoc(doc(db, 'personality_responses', uid), {
        responses: arrayUnion(responseObj),
      });

      // Get all responses to check if complete
      const snap = await getDoc(doc(db, 'personality_responses', uid));
      const allResponses = snap.data().responses;

      if (allResponses.length >= personalityQuestions.length) {
        // Compute personality vector in browser
        const { personalityVector, domainPriors } = computePersonalityVector(allResponses, personalityQuestions);
        
        await updateDoc(doc(db, 'personality_responses', uid), {
          personalityVector,
          domainPriors,
          completedAt: new Date().toISOString(),
        });
        
        await updateDoc(doc(db, 'users', uid), {
          personalityComplete: true,
          assessmentStatus: 'in_progress',
        });
        
        navigate('/quiz/intro');
      } else {
        setCurrentIdx(allResponses.length);
        setUserResponse(null);
      }
    } catch (err) {
      console.error(err);
      addToast("Something went wrong. Your progress is saved. Please try again.", "error");
    } finally {
      if(currentIdx < personalityQuestions.length - 1) {
        setSubmitting(false);
      }
    }
  };

  if (loading || personalityQuestions.length === 0) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const currentQ = personalityQuestions[currentIdx];
  if (!currentQ) return <div className="min-h-screen flex items-center justify-center">Redirecting...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-16 px-4">
      <div className="bg-white max-w-2xl w-full rounded-xl shadow-sm border border-gray-100 p-8">
        
        <div className="mb-8">
          <div className="flex justify-between text-sm font-bold text-gray-500 mb-2 uppercase tracking-wider">
            <span>Progress</span>
            <span>Question {currentIdx + 1} of {personalityQuestions.length}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${(currentIdx / personalityQuestions.length) * 100}%` }}></div>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-10 leading-relaxed text-center">
          {currentQ.text}
        </h2>

        {currentQ.type === 'likert' && (
          <div className="flex flex-col sm:flex-row justify-between items-center bg-gray-50 p-6 rounded-lg mb-8 border border-gray-200 space-y-4 sm:space-y-0">
            <span className="text-sm font-bold text-gray-500 w-full sm:w-1/4 text-center sm:text-left">Strongly Disagree</span>
            
            <div className="flex space-x-2 sm:space-x-4 justify-center flex-1">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  onClick={() => setUserResponse(val)}
                  className={`w-12 h-12 rounded-full font-bold text-lg transition shadow-sm border flex items-center justify-center
                    ${userResponse === val 
                      ? 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-100 scale-110 shadow-md' 
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50 hover:shadow-md'}
                  `}
                >
                  {val}
                </button>
              ))}
            </div>

            <span className="text-sm font-bold text-gray-500 w-full sm:w-1/4 text-center sm:text-right">Strongly Agree</span>
          </div>
        )}

        {(currentQ.type === 'mcq' || currentQ.type === 'forced_choice') && (
          <div className="grid grid-cols-1 gap-3 mb-8">
            {currentQ.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => setUserResponse(opt)}
                className={`w-full text-left p-4 rounded-lg border transition shadow-sm
                  ${userResponse === opt 
                    ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-100 font-semibold' 
                    : 'border-gray-200 hover:border-blue-300 bg-white text-gray-700 hover:bg-blue-50'}
                `}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!userResponse || submitting}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-lg shadow-sm hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving...' : 'Next'}
        </button>

      </div>
    </div>
  );
}
