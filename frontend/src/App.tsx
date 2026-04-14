import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { auth } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, type User } from 'firebase/auth';

const API_URL = 'http://localhost:5000';

function AuthContext({ children }: any) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-white text-center mt-20">Loading App Securely...</div>;
  return <div className="auth-context w-full max-w-4xl">{React.Children.map(children, child => React.cloneElement(child, { user }))}</div>;
}

// --- SECURE FETCHER ---
async function fetchSecure(url: string, user: User, options: RequestInit = {}) {
  const token = await user.getIdToken();
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  const res = await fetch(`${API_URL}${url}`, { ...options, headers: { ...headers, ...options.headers } });
  return res.json();
}

// --- LOGIN PAGE ---
function Login({ user }: any) {
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  if (user) return <Navigate to="/dashboard" />;

  const handleAuth = async (isSignUp: boolean) => {
    try {
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(auth, email, pwd);
        await fetch(`${API_URL}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid: cred.user.uid, email }) });
      } else {
        await signInWithEmailAndPassword(auth, email, pwd);
      }
    } catch (e: any) { alert(e.message); }
  };

  return (
    <div className="glass-card max-w-md mx-auto text-center mt-20">
      <h1 className="text-3xl font-bold mb-6 text-white tracking-widest">APNA CAREER</h1>
      <input className="input-field w-full mb-4" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input className="input-field w-full mb-6" type="password" placeholder="Password" value={pwd} onChange={e => setPwd(e.target.value)} />
      <div className="flex gap-4 mb-4">
        <button className="btn-primary flex-1" onClick={() => handleAuth(false)}>Login</button>
        <button className="btn-outline flex-1" onClick={() => handleAuth(true)}>Sign Up</button>
      </div>
    </div>
  );
}

// --- DASHBOARD PAGE ---
function Dashboard({ user }: any) {
  const [data, setData] = useState<any>(null);
  const nav = useNavigate();

  useEffect(() => {
    if (user) fetchSecure('/user/dashboard', user).then(setData);
  }, [user]);

  if (!user) return <Navigate to="/" />;

  return (
    <div className="p-8 fade-in">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">Welcome, {user.email}</h1>
        <button className="btn-outline text-sm py-2 px-4" onClick={() => signOut(auth)}>Logout</button>
      </div>

      <div className="flex gap-6 mb-12">
        <button className="btn-primary w-full max-w-sm flex items-center justify-center gap-2" onClick={() => nav('/personality')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          Start New Technical Assessment
        </button>
      </div>

      {data && (
        <div className="grid md:grid-cols-2 gap-8">
          <div className="glass-card">
            <h2 className="text-xl font-bold mb-4 text-slate-300">Target Weaknesses (BKT Sync)</h2>
            <ul className="text-slate-400 space-y-2 list-disc list-inside">
              {data.weakAreas?.length > 0 ? data.weakAreas.map((w: string) => <li key={w}>{w}</li>) : <li>No registered data yet.</li>}
            </ul>
          </div>
          <div className="glass-card">
            <h2 className="text-xl font-bold mb-4 text-slate-300">Recent Assessments</h2>
            {data.recentAssessments?.slice(0, 3).map((a: any) => (
              <div key={a.id} className="border-b border-white/10 pb-4 mb-4">
                <div className="font-semibold text-blue-400">{a.finalDomain || 'Incomplete'} Path</div>
                <div className="text-slate-400 text-sm mt-2">{a.roleRecommendations?.join(', ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- PERSONALITY & QUIZ ---
function AssessmentPipeline({ user }: any) {
  const [stage, setStage] = useState<'PERSONALITY' | 'QUIZ'>('PERSONALITY');
  const [personalityQuestions, setPersonalityQuestions] = useState<any[]>([]);
  const [pIndex, setPIndex] = useState(0);
  const [pAnswers, setPAnswers] = useState<{ trait: string, score: number }[]>([]);

  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [phase, setPhase] = useState('Screening');
  const nav = useNavigate();

  useEffect(() => { fetch(`${API_URL}/personality-questions`).then(r => r.json()).then(d => setPersonalityQuestions(d.questions)); }, []);

  const handlePersonalityAnswer = async (score: number) => {
    const q = personalityQuestions[pIndex];
    const newAnswers = [...pAnswers, { trait: q.trait, score }];
    setPAnswers(newAnswers);

    if (pIndex + 1 < personalityQuestions.length) setPIndex(pIndex + 1);
    else {
      await fetchSecure('/personality', user, { method: 'POST', body: JSON.stringify({ answers: newAnswers }) });
      const qData = await fetchSecure('/quiz/start', user, { method: 'POST' });
      setCurrentQuestion(qData.currentQuestion);
      setPhase(qData.phase);
      setStage('QUIZ');
    }
  };

  const handleQuizAnswer = async (answer: string) => {
    const data = await fetchSecure('/quiz/answer', user, { method: 'POST', body: JSON.stringify({ answer }) });
    if (data.finished) nav('/result');
    else {
      setCurrentQuestion(data.currentQuestion);
      setPhase(data.phase);
    }
  };

  return (
    <div className="fade-in pt-16 max-w-2xl mx-auto">
      {stage === 'PERSONALITY' && personalityQuestions.length > 0 && (
        <div className="glass-card">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Stage 1: Psychographic Analysis</div>
          <div className="h-2 bg-white/5 rounded-full mb-8 overflow-hidden"><div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${(pIndex / personalityQuestions.length) * 100}%` }}></div></div>
          <h2 className="text-2xl font-medium mb-8 leading-snug">{personalityQuestions[pIndex].text}</h2>
          <div className="grid gap-3">
            <button className="btn-outline" onClick={() => handlePersonalityAnswer(1.0)}>Strongly Agree</button>
            <button className="btn-outline" onClick={() => handlePersonalityAnswer(0.0)}>Strongly Disagree</button>
          </div>
        </div>
      )}

      {stage === 'QUIZ' && currentQuestion && (
        <div className="glass-card">
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold uppercase">{phase} State</span>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold uppercase">Bloom: {currentQuestion.bloomLevel}</span>
          </div>
          <p className="text-slate-400 text-sm mb-4">{currentQuestion.domain} • {currentQuestion.concept}</p>
          <h2 className="text-2xl font-medium mb-8 leading-snug">{currentQuestion.content}</h2>

          {currentQuestion.type === 'MCQ' ? (
            <div className="grid gap-3">
              {currentQuestion.options?.map((opt: string) => <button key={opt} className="btn-outline text-left" onClick={() => handleQuizAnswer(opt)}>{opt}</button>)}
            </div>
          ) : (
            <div>
              <textarea placeholder="Write architectural rationale..." className="input-field w-full h-32 mb-4 resize-none" onKeyDown={(e: any) => e.key === 'Enter' && (e.preventDefault(), handleQuizAnswer(e.target.value))} />
              <p className="text-xs text-slate-500">Press ENTER to evaluate via LLM proxy model.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- RESULT PAGE ---
function Result({ user }: any) {
  const [data, setData] = useState<any>(null);
  const nav = useNavigate();
  useEffect(() => { if (user) fetchSecure('/quiz/result', user).then(setData); }, [user]);

  if (!data) return <div className="mt-20">Computing Vectors...</div>;

  return (
    <div className="fade-in max-w-3xl mx-auto pt-16">
      <div className="glass-card mb-8">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">
          {data.recommendations.bestDomain} Engineering
        </h1>
        <p className="text-slate-400">Final Washington Accord Pipeline Result</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="glass-card">
          <h2 className="text-lg font-bold text-slate-300 mb-4">Recommended Deployments</h2>
          <div className="flex flex-wrap gap-2">{data.recommendations.recommendedRoles.map((r: string) => <span key={r} className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm font-semibold">{r}</span>)}</div>
        </div>
        <div className="glass-card">
          <h2 className="text-lg font-bold text-slate-300 mb-4">Washington Accord Performance</h2>
          {Object.entries(data.profile.attributeScores).map(([po, sc]) => <div key={po} className="flex justify-between mb-2"><span className="text-slate-400">{po} Competency</span><span className="text-emerald-400 font-bold">{Math.round((sc as number) * 100)}%</span></div>)}
        </div>
      </div>
      <button className="btn-primary mx-auto block" onClick={() => nav('/dashboard')}>Return to Dashboard</button>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen w-full flex justify-center text-slate-200">
        <AuthContext>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/personality" element={<AssessmentPipeline />} />
            <Route path="/result" element={<Result />} />
          </Routes>
        </AuthContext>
      </div>
    </Router>
  );
}
