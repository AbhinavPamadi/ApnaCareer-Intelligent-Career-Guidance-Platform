import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { personalityQuestions } from '../data/personalityQuestions';
import { computePersonalityVector } from '../engine/personality';
import { useToast } from '../components/ToastContext';

export default function Personality() {
  const navigate = useNavigate();
  const addToast = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userResponse, setUserResponse] = useState(null);

  useEffect(() => {
    async function loadPersonality() {
      try {
        const uid = auth.currentUser.uid;
        let snap = await getDoc(doc(db, 'personality_responses', uid));
        let data = snap.exists() ? snap.data() : { responses: [] };
        
        if (data.completedAt) {
          navigate('/dashboard');
          return;
        }

        setSessionData(data);
        setCurrentIdx(data.responses.length);
      } catch (err) {
        addToast("Something went wrong. Your progress is saved. Please try again.", "error");
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
        response: parseInt(userResponse, 10),
        answeredAt: new Date().toISOString(),
      };

      const updatedResponses = [...(sessionData.responses || []), responseObj];

      await updateDoc(doc(db, 'personality_responses', uid), {
        responses: arrayUnion(responseObj),
      }).catch(async (e) => {
        // if document doesn't exist, set it instead of update.
         await import('firebase/firestore').then(({setDoc}) => setDoc(doc(db, 'personality_responses', uid), { responses: [responseObj] }));
      });

      if (updatedResponses.length >= personalityQuestions.length) {
        const { personalityVector, domainPriors } = computePersonalityVector(updatedResponses, personalityQuestions);
        
        await updateDoc(doc(db, 'personality_responses', uid), {
          personalityVector,
          domainPriors,
          completedAt: new Date().toISOString(),
        });
        
        await updateDoc(doc(db, 'users', uid), {
          personalityComplete: true,
          assessmentStatus: 'in_progress',
        });
        
        navigate('/dashboard');
      } else {
        setSessionData({ ...sessionData, responses: updatedResponses });
        setCurrentIdx(updatedResponses.length);
        setUserResponse(null);
      }
    } catch (err) {
      console.error(err);
      addToast("Something went wrong. Your progress is saved. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const currentQ = personalityQuestions[currentIdx];
  if (!currentQ) return <div className="min-h-screen flex items-center justify-center">Redirecting...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-2xl w-full rounded-xl shadow border border-gray-100 p-8">
        
        <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
          <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${(currentIdx / personalityQuestions.length) * 100}%` }}></div>
        </div>
        <p className="text-sm font-bold text-gray-500 mb-6 uppercase tracking-wider">
          Question {currentIdx + 1} of {personalityQuestions.length}
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mb-8 leading-relaxed">
          {currentQ.text}
        </h2>

        <div className="flex justify-between items-center bg-gray-50 p-6 rounded-lg mb-8 border border-gray-200">
          <span className="text-sm font-bold text-gray-500 hidden sm:block">Strongly Disagree</span>
          <div className="flex space-x-2 sm:space-x-4 w-full sm:w-auto justify-between">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                onClick={() => setUserResponse(val)}
                className={`w-12 h-12 rounded-full font-bold text-lg transition shadow-sm border
                  ${userResponse === val 
                    ? 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-100 scale-110' 
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'}
                `}
              >
                {val}
              </button>
            ))}
          </div>
          <span className="text-sm font-bold text-gray-500 hidden sm:block">Strongly Agree</span>
        </div>
        
        <div className="flex justify-between sm:hidden mb-8 text-xs text-gray-500 px-2 font-bold">
          <span>Strongly Disagree</span>
          <span>Strongly Agree</span>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!userResponse || submitting}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-lg shadow-sm hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving...' : 'Next Question'}
        </button>

      </div>
    </div>
  );
}
