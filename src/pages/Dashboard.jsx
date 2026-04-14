import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { doc, getDoc, writeBatch, collection, getDocs, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import Navbar from '../components/Navbar';
import { useToast } from '../components/ToastContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [resultsData, setResultsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resetting, setResetting] = useState(false);
  const addToast = useToast();

  useEffect(() => {
    async function loadDashboard() {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate('/auth');
          return;
        }

        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserData(data);

          if (data.assessmentStatus === 'complete' || data.assessmentStatus === 'remedial') {
            const resultsSnap = await getDoc(doc(db, 'results', user.uid));
            if (resultsSnap.exists()) {
              setResultsData(resultsSnap.data());
            }
          }
        }
      } catch (err) {
        addToast('Something went wrong. Your progress is saved. Please try again.', 'error');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [navigate]);

  const handleLogout = async () => {
    // Navbar handles logout, retaining if needed but mostly navbar will hook it
  };

  const handleStartAssessment = async () => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        assessmentStatus: 'in_progress',
        personalityComplete: false,
        quizComplete: false,
        currentPhase: 1,
      });
      setUserData((prev) => ({
        ...prev,
        assessmentStatus: 'in_progress',
        personalityComplete: false,
        quizComplete: false,
        currentPhase: 1,
      }));
    } catch (err) {
      console.error(err);
      // Continue to personality route even if status update fails.
    }

    navigate('/personality');
  };

  const handleReset = async () => {
    const user = auth.currentUser;
    if (!user) return;
    if (!window.confirm("Are you sure you want to retake the entire assessment? All progress and results will be lost.")) return;

    setResetting(true);
    try {
      const batch = writeBatch(db);

      batch.update(doc(db, 'users', user.uid), {
        assessmentStatus: 'not_started',
        personalityComplete: false,
        quizComplete: false,
        currentPhase: 1,
        questionsAnsweredCount: 0,
      });

      batch.delete(doc(db, 'personality_responses', user.uid));
      batch.delete(doc(db, 'quiz_sessions', user.uid));
      batch.delete(doc(db, 'bkt_beliefs', user.uid));
      batch.delete(doc(db, 'results', user.uid));

      await batch.commit();

      const answersSnap = await getDocs(collection(db, 'quiz_responses', user.uid, 'answers'));
      const delBatch = writeBatch(db);
      answersSnap.docs.forEach(d => delBatch.delete(d.ref));
      if (!delBatch._mutations || delBatch._mutations.length > 0) {
        await delBatch.commit();
      }

      setUserData(prev => ({
        ...prev,
        assessmentStatus: 'not_started',
        personalityComplete: false,
        quizComplete: false,
        currentPhase: 1,
      }));
      setResultsData(null);
    } catch (err) {
      console.error(err);
      addToast('Something went wrong. Your progress is saved. Please try again.', 'error');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
  }

  if (!userData) {
    return <div className="min-h-screen flex items-center justify-center">User not found</div>;
  }

  const { assessmentStatus, name, currentPhase, personalityComplete, quizComplete } = userData;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full p-6">
        {assessmentStatus === 'not_started' && (
          <div className="bg-white rounded-2xl shadow p-8 text-center space-y-6 border border-blue-100 mt-10">
            <h2 className="text-3xl font-bold text-gray-900">Welcome to Apna Career!</h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              Your journey begins here. You will first take a brief personality quiz to help us understand your traits, followed by an adaptive technical assessment aligned with the Washington Accord.
            </p>
            <button
              onClick={handleStartAssessment}
              className="inline-block bg-blue-600 text-white font-bold text-lg px-8 py-3 rounded-full shadow hover:bg-blue-700 transition"
            >
              Start Assessment
            </button>
          </div>
        )}

        {assessmentStatus === 'in_progress' && (
          <div className="bg-white rounded-xl shadow p-8 space-y-6 border border-gray-100 mt-10 text-center">
            <h2 className="text-2xl font-bold text-gray-900">Assessment In Progress</h2>
            
            <div className="w-full max-w-md mx-auto bg-gray-200 rounded-full h-4 mb-4">
              <div 
                className="bg-blue-600 h-4 rounded-full transition-all duration-500" 
                style={{ width: `${(currentPhase / 8) * 100}%` }}
              ></div>
            </div>
            <p className="text-gray-600 font-medium">
              You are in Phase {currentPhase}: {personalityComplete ? 'Technical Assessment' : 'Personality Quiz'}
            </p>

            <div className="pt-4">
              <button
                onClick={() => navigate(personalityComplete && !quizComplete ? '/quiz' : '/personality')}
                className="bg-blue-600 text-white font-bold text-lg px-8 py-3 rounded-full shadow hover:bg-blue-700 transition"
              >
                Resume Assessment
              </button>
            </div>
          </div>
        )}

        {(assessmentStatus === 'complete' || assessmentStatus === 'remedial') && resultsData && (
          <div className="bg-white rounded-xl shadow p-8 space-y-6 border border-gray-100 mt-10 text-center">
            <h2 className="text-3xl font-bold text-gray-900">Assessment Complete</h2>
            <div className="my-6 space-y-2 pb-6 border-b border-gray-100">
              <p className="text-gray-500 uppercase tracking-widest text-sm font-bold">Best Domain Match</p>
              <p className="text-4xl font-extrabold text-blue-600">{resultsData.bestDomain}</p>
              
              <div className="mt-4 pt-4">
                <p className="text-gray-500 uppercase tracking-widest text-sm font-bold mb-2">Top Role Recommendation</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {resultsData.topRoles?.map((role, idx) => (
                    <span key={idx} className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-bold">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => navigate('/results')}
                className="bg-blue-600 text-white font-bold text-base px-6 py-2 rounded shadow hover:bg-blue-700 transition"
              >
                View Full Results
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="bg-white border border-gray-300 text-gray-700 font-bold text-base px-6 py-2 rounded shadow hover:bg-gray-50 transition disabled:opacity-50"
              >
                {resetting ? 'Resetting...' : 'Retake Assessment'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
