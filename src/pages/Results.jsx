import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, writeBatch, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import Navbar from '../components/Navbar';
import { useToast } from '../components/ToastContext';

export default function Results() {
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const addToast = useToast();

  useEffect(() => {
    async function loadResults() {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate('/auth');
          return;
        }
        
        const snap = await getDoc(doc(db, 'results', user.uid));
        if (!snap.exists()) {
          navigate('/dashboard');
          return;
        }
        
        setResults(snap.data());
      } catch(err) {
        console.error(err);
        addToast('Something went wrong. Your progress is saved. Please try again.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadResults();
  }, [navigate]);

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

      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      addToast('Something went wrong. Your progress is saved. Please try again.', 'error');
    } finally {
      setResetting(false);
    }
  };

  const handleDownload = () => {
    alert('Coming soon');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Results...</div>;
  if (!results) return null;

  // Format Data for Recharts
  const domainData = Object.entries(results.domainScores || {}).map(([name, score]) => ({
    name,
    score: Math.round(score * 100),
    rawScore: score
  }));

  const personalityData = [
    { subject: 'Analytical', A: results.personalityVector?.analytical || 0, fullMark: 1 },
    { subject: 'Creativity', A: results.personalityVector?.creativity || 0, fullMark: 1 },
    { subject: 'Practical', A: results.personalityVector?.practical || 0, fullMark: 1 },
    { subject: 'Structure', A: results.personalityVector?.structure || 0, fullMark: 1 },
    { subject: 'Optimization', A: results.personalityVector?.optimization || 0, fullMark: 1 },
  ];

  const waData = Object.entries(results.waAttributes || {}).map(([name, score]) => ({
    name,
    score: Math.round(score * 100)
  }));

  const getDomainColor = (score) => {
    if (score >= 0.65) return '#10b981'; // green-500
    if (score >= 0.45) return '#f59e0b'; // yellow-500
    return '#ef4444'; // red-500
  };

  const roleDescriptions = {
    'Software Development Engineer': 'Build scalable applications and drive problem-solving logic.',
    'Backend Engineer': 'Architect secure and performant server infrastructures.',
    'Systems Programmer': 'Create optimized, low-level system designs connecting hardware to software.',
    'Frontend Engineer': 'Craft dynamic and responsive user interfaces using the best frameworks.',
    'UI/UX Engineer': 'Merge creativity with technology to design human-centered digital experiences.',
    'Full Stack Developer': 'Handle end-to-end setups bridging front interfaces with remote backend flows.',
    'ML Engineer': 'Deploy production-grade machine learning models to solve data-centric issues.',
    'Data Scientist': 'Discover deep insights through quantitative models tailored for efficiency.',
    'AI/ML Researcher': 'Advance the edge of cognitive artificial intelligence.',
    'Systems Engineer': 'Oversee overarching component integrations aligning large infrastructure boundaries.',
    'DevOps Engineer': 'Power CI/CD pipelines enabling bullet-proof deployment strategies.',
    'Cloud Infrastructure Engineer': 'Design sprawling distributed microservices on the cloud.'
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800">
      <Navbar />
      <div className="max-w-5xl mx-auto space-y-10 py-12 px-4 sm:px-6 lg:px-8 w-full">
        
        {/* Header Actions */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h1 className="text-3xl font-extrabold text-gray-900">Your Engineering Profile</h1>
          <div className="flex space-x-3">
            <button onClick={handleDownload} className="text-gray-600 bg-gray-100 hover:bg-gray-200 font-bold py-2 px-4 rounded shadow-sm transition">
              Download Report
            </button>
            <button onClick={handleReset} disabled={resetting} className="text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-bold py-2 px-4 rounded shadow-sm transition">
              {resetting ? 'Resetting...' : 'Retake Assessment'}
            </button>
          </div>
        </div>

        {/* A. Top Match Card */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl shadow-xl overflow-hidden p-8 flex flex-col md:flex-row items-center justify-between">
          <div className="space-y-3 p-4">
            <h2 className="text-lg font-bold uppercase tracking-widest text-blue-200">Best Domain</h2>
            <p className="text-5xl font-black">{results.bestDomain}</p>
            <span className="inline-block px-4 py-1 bg-white text-indigo-700 rounded-full text-sm font-bold mt-2 shadow">
              {results.competencyLevel} Level
            </span>
          </div>
          <div className="flex flex-col items-start md:items-end p-4 border-t md:border-t-0 md:border-l border-indigo-400 mt-6 md:mt-0 pt-6 md:pt-0">
             <h2 className="text-sm font-bold uppercase tracking-widest text-blue-200 mb-2">Prime Recommendation</h2>
             <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-300 to-yellow-300">
                {results.topRoles?.[0] || 'Software Engineer'}
             </p>
          </div>
        </div>

        {/* I. Remedial Path */}
        {results.remedialPath && (
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-bold text-red-800 mb-2">Remedial Focus Required</h3>
            <p className="text-red-700 mb-4">
              We highly encourage pausing to strengthen your foundational programming paradigms. 
              Review the fundamentals of <strong>{results.bestDomain}</strong>, concentrating on syntax logic and base algorithms.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* B. Domain Fit Bar Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold mb-6">Domain Proficiency</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={domainData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" />
                  <Tooltip />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {domainData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getDomainColor(entry.rawScore)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* C. Personality Radar Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
            <h3 className="text-xl font-bold w-full text-left mb-2">Personality Traits</h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={personalityData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" textAnchor="middle" />
                  <Tooltip />
                  <Radar name="Traits" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.6} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center w-full">These are soft signals that complement your quiz performance</p>
          </div>
        </div>

        {/* E & F: Washington Accord & Skill Attributes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* E. Washington Accord */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold mb-6">Washington Accord Attainment</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* F. Skill Attribute Scores */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold mb-6">Functional Engineering Skills</h3>
            <div className="space-y-6">
              {Object.entries(results.skillAttributes || {}).map(([skill, val]) => (
                <div key={skill} className="w-full">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-bold text-gray-700 capitalize">
                      {skill.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <span className="text-sm font-bold text-gray-500">{Math.round(val * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full transition-all" style={{ width: `${Math.round(val * 100)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* G. Role Recommendation Cards */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
           <h3 className="text-2xl font-bold mb-6 text-gray-900 border-b border-gray-100 pb-3">Recommended Career Roles</h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
             {results.topRoles?.map((role, idx) => (
               <div key={idx} className="bg-gray-50 border border-gray-200 p-5 rounded-lg hover:shadow-md transition">
                 <h4 className="text-lg font-bold text-blue-700 mb-2">{role}</h4>
                 <p className="text-sm text-gray-600 leading-relaxed font-medium">
                   {roleDescriptions[role] || 'An excellent path balancing strong fundamentals with domain specialization.'}
                 </p>
               </div>
             ))}
           </div>
        </div>

        {/* D & H: Concepts Breakdown and Skill Gaps */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-2xl font-bold mb-6 border-b border-gray-100 pb-3 text-gray-900">Knowledge Concept Mapping</h3>
          
          <div className="space-y-8">
            {Object.entries(results.conceptProfile || {}).map(([domain, concepts]) => (
              <div key={domain}>
                <h4 className="text-lg font-bold text-gray-800 mb-4">{domain} Paradigm</h4>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(concepts).map(([conceptName, data]) => {
                    let badgeClass = 'bg-gray-100 text-gray-800';
                    if (data.status === 'Strong') badgeClass = 'bg-green-100 text-green-800 border border-green-200';
                    else if (data.status === 'Weak') badgeClass = 'bg-red-100 text-red-800 border border-red-200';
                    else badgeClass = 'bg-yellow-100 text-yellow-800 border border-yellow-200';

                    return (
                      <span key={conceptName} className={`px-3 py-1.5 rounded-full text-xs font-bold ${badgeClass}`}>
                         {conceptName} &bull; {data.status}
                      </span>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* H. Skill Gaps */}
          {results.skillGaps?.length > 0 && (
             <div className="mt-10 p-6 bg-red-50 border border-red-100 rounded-lg">
                <h4 className="text-lg font-bold text-red-800 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                  Focus areas for improvement
                </h4>
                <ul className="list-disc list-inside text-red-700 text-sm space-y-1 font-medium ml-2">
                  {results.skillGaps.map((gap, i) => <li key={i}>{gap}</li>)}
                </ul>
             </div>
          )}
        </div>

      </div>
    </div>
  );
}
