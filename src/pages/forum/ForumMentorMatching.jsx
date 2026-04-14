import { useEffect, useMemo, useState } from 'react';
import Navbar from '../../components/Navbar';
import { auth, db } from '../../firebase';
import { addDoc, collection, doc, limit, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { useToast } from '../../components/ToastContext';

const EXPERTISE_OPTIONS = [
  'Web Development', 'Mobile App Development', 'Data Science', 'Machine Learning',
  'AI/ML', 'DevOps', 'Cybersecurity', 'Cloud Computing', 'Blockchain',
  'Game Development', 'UI/UX Design', 'Product Management', 'Software Engineering',
  'Research', 'Competitive Programming', 'Academic Excellence',
];

const SUBJECT_OPTIONS = [
  'Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology',
  'Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering',
  'Chemical Engineering', 'Electronics', 'Information Technology',
  'Business Administration', 'Economics', 'Psychology', 'Medicine',
  'Law', 'Arts', 'Commerce', 'English Literature',
];

const FALLBACK_MENTORS = [
  {
    id: 'demo_m1',
    name: 'Priya Sharma',
    degree: 'B.Tech Computer Science',
    yearOfStudy: 4,
    college: 'NIT Trichy',
    rating: 4.8,
    currentMentees: 3,
    menteeCapacity: 5,
    bio: 'I can help with web dev roadmap, internship prep, and resume reviews.',
    expertise: ['Web Development', 'Software Engineering', 'Placement'],
    subjects: ['Computer Science', 'Mathematics'],
  },
  {
    id: 'demo_m2',
    name: 'Arjun Mehta',
    degree: 'B.Tech Information Technology',
    yearOfStudy: 3,
    college: 'IIIT Allahabad',
    rating: 4.6,
    currentMentees: 2,
    menteeCapacity: 4,
    bio: 'Focused on ML fundamentals, projects, and hackathon guidance.',
    expertise: ['Machine Learning', 'Data Science', 'Research'],
    subjects: ['Information Technology', 'Mathematics'],
  },
];

export default function ForumMentorMatching() {
  const addToast = useToast();
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExpertise, setSelectedExpertise] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [minYear, setMinYear] = useState('all');

  const [showMentorForm, setShowMentorForm] = useState(false);
  const [isSubmittingMentor, setIsSubmittingMentor] = useState(false);
  const [mentorForm, setMentorForm] = useState({
    bio: '',
    degree: '',
    college: '',
    graduationYear: new Date().getFullYear() + 1,
    currentRole: '',
    company: '',
    expertise: [],
    subjects: [],
    yearOfStudy: 3,
    gpa: '',
    menteeCapacity: 5,
  });

  const [connectMentor, setConnectMentor] = useState(null);
  const [connectionMessage, setConnectionMessage] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'mentors'), where('isActive', '==', true), limit(50));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const mentorsList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        mentorsList.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        setMentors(mentorsList);
        setLoading(false);
      },
      () => {
        setLoading(false);
        addToast('Failed to load mentors.', 'error');
      }
    );
    return () => unsub();
  }, [addToast]);

  const displayMentors = useMemo(() => {
    const live = mentors.filter((m) => !String(m.id || '').startsWith('demo_'));
    return [...FALLBACK_MENTORS, ...live];
  }, [mentors]);

  const filteredMentors = useMemo(() => {
    let out = displayMentors;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      out = out.filter((m) =>
        `${m.name || ''} ${m.college || ''} ${m.degree || ''}`.toLowerCase().includes(s)
      );
    }
    if (selectedExpertise !== 'all') out = out.filter((m) => (m.expertise || []).includes(selectedExpertise));
    if (selectedSubject !== 'all') out = out.filter((m) => (m.subjects || []).includes(selectedSubject));
    if (minYear !== 'all') out = out.filter((m) => Number(m.yearOfStudy || 0) >= Number(minYear));
    return out;
  }, [displayMentors, searchTerm, selectedExpertise, selectedSubject, minYear]);

  const updateMentorField = (field, value) => setMentorForm((prev) => ({ ...prev, [field]: value }));

  const toggleFromList = (field, value) => {
    setMentorForm((prev) => {
      const list = prev[field];
      const exists = list.includes(value);
      return { ...prev, [field]: exists ? list.filter((v) => v !== value) : [...list, value] };
    });
  };

  const handleBecomeMentor = async () => {
    const user = auth.currentUser;
    if (!user) return addToast('Please login to become a mentor.', 'error');
    if (!mentorForm.bio.trim() || !mentorForm.degree.trim() || !mentorForm.college.trim() || mentorForm.expertise.length === 0 || mentorForm.subjects.length === 0) {
      return addToast('Fill all required mentor profile fields.', 'error');
    }
    setIsSubmittingMentor(true);
    try {
      await setDoc(doc(db, 'mentors', user.uid), {
        userId: user.uid,
        name: user.displayName || user.email || 'Anonymous User',
        email: user.email || '',
        avatar: user.photoURL || '',
        bio: mentorForm.bio.trim(),
        degree: mentorForm.degree.trim(),
        college: mentorForm.college.trim(),
        graduationYear: Number(mentorForm.graduationYear),
        currentRole: mentorForm.currentRole.trim(),
        company: mentorForm.company.trim(),
        expertise: mentorForm.expertise,
        subjects: mentorForm.subjects,
        yearOfStudy: Number(mentorForm.yearOfStudy),
        gpa: mentorForm.gpa ? Number(mentorForm.gpa) : null,
        menteeCapacity: Number(mentorForm.menteeCapacity),
        currentMentees: 0,
        rating: 4.5,
        reviewCount: 0,
        isActive: true,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }, { merge: true });
      setShowMentorForm(false);
      addToast('Mentor profile is now live.', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to create mentor profile.', 'error');
    } finally {
      setIsSubmittingMentor(false);
    }
  };

  const handleSendConnection = async () => {
    const user = auth.currentUser;
    if (!user) return addToast('Please login to connect with mentors.', 'error');
    if (!connectMentor) return;
    if (!connectionMessage.trim()) return addToast('Please write a message for mentor.', 'error');
    setIsConnecting(true);
    try {
      await addDoc(collection(db, 'mentor_connections'), {
        mentorId: connectMentor.id,
        mentorName: connectMentor.name || '',
        studentId: user.uid,
        studentName: user.displayName || user.email || 'Anonymous User',
        studentEmail: user.email || '',
        message: connectionMessage.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      addToast(`Request sent to ${connectMentor.name || 'mentor'}.`, 'success');
      setConnectMentor(null);
      setConnectionMessage('');
    } catch (err) {
      console.error(err);
      addToast('Failed to send connection request.', 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <section className="bg-white border border-blue-100 rounded-2xl shadow-sm p-6 sm:p-8 mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Peer Mentor Matching</h1>
          <p className="text-gray-600 mt-3">Find a college student 1-3 years senior who took a similar academic path.</p>
        </section>

        <section className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Mentor Discovery</h2>
              <p className="text-sm text-gray-600 mt-1">Search mentors by expertise, subject, and year.</p>
            </div>
            <button onClick={() => setShowMentorForm(true)} className="bg-white border border-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-lg hover:bg-gray-50">
              Become a Mentor
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-5">
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search mentors, colleges..." className="border border-gray-300 rounded-lg px-3 py-2" />
            <select value={selectedExpertise} onChange={(e) => setSelectedExpertise(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2">
              <option value="all">All Expertise</option>
              {EXPERTISE_OPTIONS.map((exp) => <option key={exp} value={exp}>{exp}</option>)}
            </select>
            <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2">
              <option value="all">All Subjects</option>
              {SUBJECT_OPTIONS.map((sub) => <option key={sub} value={sub}>{sub}</option>)}
            </select>
            <select value={minYear} onChange={(e) => setMinYear(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2">
              <option value="all">Any Year</option>
              <option value="2">2nd Year+</option>
              <option value="3">3rd Year+</option>
              <option value="4">4th Year+</option>
            </select>
          </div>
        </section>

        {loading ? (
          <section className="space-y-4">
            {[1, 2, 3].map((k) => (
              <div key={k} className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm animate-pulse">
                <div className="h-5 w-40 bg-gray-200 rounded mb-3" />
                <div className="h-4 w-56 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-72 bg-gray-200 rounded" />
              </div>
            ))}
          </section>
        ) : filteredMentors.length > 0 ? (
          <section className="space-y-4">
            {filteredMentors.map((m) => {
              const isFull = Number(m.currentMentees || 0) >= Number(m.menteeCapacity || 1);
              return (
                <article key={m.id} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold text-gray-900 text-lg">{m.name}</p>
                      <p className="text-sm text-gray-600">
                        {m.degree} • {m.yearOfStudy}
                        {m.yearOfStudy === 1 ? 'st' : m.yearOfStudy === 2 ? 'nd' : m.yearOfStudy === 3 ? 'rd' : 'th'} Year
                      </p>
                      <p className="text-sm text-gray-500 mt-1">{m.college}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-700">⭐ {(Number(m.rating || 0)).toFixed(1)}</p>
                      <p className="text-xs text-gray-500">{Number(m.currentMentees || 0)}/{Number(m.menteeCapacity || 0)} mentees</p>
                    </div>
                  </div>
                  {m.bio && <p className="text-sm text-gray-700 mt-3">{m.bio}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(m.expertise || []).slice(0, 4).map((exp) => <span key={exp} className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">{exp}</span>)}
                    {(m.subjects || []).slice(0, 3).map((sub) => <span key={sub} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{sub}</span>)}
                  </div>
                  <div className="mt-4">
                    <button onClick={() => setConnectMentor(m)} disabled={isFull} className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-50">
                      {isFull ? 'Full' : 'Connect'}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="bg-white border border-gray-100 rounded-xl p-8 text-center shadow-sm">
            <p className="font-semibold text-gray-900">No mentors found</p>
            <p className="text-sm text-gray-600 mt-1">Try changing filters or become the first mentor.</p>
            <button onClick={() => setShowMentorForm(true)} className="mt-4 bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg">
              Become a Mentor
            </button>
          </section>
        )}

        {showMentorForm && (
          <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
              <h3 className="text-xl font-bold text-gray-900">Create Your Mentor Profile</h3>
              <p className="text-sm text-gray-600 mt-1">Help junior students by sharing your experience.</p>
              <div className="space-y-4 mt-5">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Bio *</label>
                  <textarea rows={3} value={mentorForm.bio} onChange={(e) => updateMentorField('bio', e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 mt-1" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Degree/Course *</label>
                    <input value={mentorForm.degree} onChange={(e) => updateMentorField('degree', e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">College/University *</label>
                    <input value={mentorForm.college} onChange={(e) => updateMentorField('college', e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Year of Study *</label>
                    <select value={mentorForm.yearOfStudy} onChange={(e) => updateMentorField('yearOfStudy', Number(e.target.value))} className="w-full border border-gray-300 rounded-lg p-2 mt-1">
                      <option value={1}>1st Year</option><option value={2}>2nd Year</option><option value={3}>3rd Year</option><option value={4}>4th Year</option><option value={5}>5th Year</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Graduation Year</label>
                    <input type="number" value={mentorForm.graduationYear} onChange={(e) => updateMentorField('graduationYear', Number(e.target.value))} className="w-full border border-gray-300 rounded-lg p-2 mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">GPA/CGPA</label>
                    <input value={mentorForm.gpa} onChange={(e) => updateMentorField('gpa', e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Current Role</label>
                    <input value={mentorForm.currentRole} onChange={(e) => updateMentorField('currentRole', e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Company</label>
                    <input value={mentorForm.company} onChange={(e) => updateMentorField('company', e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Expertise Areas *</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 border border-gray-200 rounded-lg p-3 max-h-36 overflow-y-auto">
                    {EXPERTISE_OPTIONS.map((exp) => (
                      <label key={exp} className="text-sm text-gray-700 flex items-center gap-2"><input type="checkbox" checked={mentorForm.expertise.includes(exp)} onChange={() => toggleFromList('expertise', exp)} /><span>{exp}</span></label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Subjects *</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 border border-gray-200 rounded-lg p-3 max-h-36 overflow-y-auto">
                    {SUBJECT_OPTIONS.map((sub) => (
                      <label key={sub} className="text-sm text-gray-700 flex items-center gap-2"><input type="checkbox" checked={mentorForm.subjects.includes(sub)} onChange={() => toggleFromList('subjects', sub)} /><span>{sub}</span></label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Mentee Capacity</label>
                  <select value={mentorForm.menteeCapacity} onChange={(e) => updateMentorField('menteeCapacity', Number(e.target.value))} className="w-full border border-gray-300 rounded-lg p-2 mt-1">
                    <option value={1}>1 mentee</option><option value={3}>3 mentees</option><option value={5}>5 mentees</option><option value={10}>10 mentees</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button onClick={() => setShowMentorForm(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700">Cancel</button>
                <button onClick={handleBecomeMentor} disabled={isSubmittingMentor} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50">{isSubmittingMentor ? 'Creating...' : 'Create Profile'}</button>
              </div>
            </div>
          </div>
        )}

        {connectMentor && (
          <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-lg p-6">
              <h3 className="text-xl font-bold text-gray-900">Connect with {connectMentor.name}</h3>
              <p className="text-sm text-gray-600 mt-1">Send a short intro and what guidance you need.</p>
              <div className="mt-4">
                <textarea rows={4} value={connectionMessage} onChange={(e) => setConnectionMessage(e.target.value)} placeholder="Hi! I am looking for guidance on..." className="w-full border border-gray-300 rounded-lg p-3" />
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => { setConnectMentor(null); setConnectionMessage(''); }} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700">Cancel</button>
                <button onClick={handleSendConnection} disabled={isConnecting} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50">{isConnecting ? 'Sending...' : 'Send Request'}</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
