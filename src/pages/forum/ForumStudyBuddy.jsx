import { useEffect, useMemo, useState } from 'react';
import Navbar from '../../components/Navbar';
import { auth, db } from '../../firebase';
import { addDoc, collection, doc, limit, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { useToast } from '../../components/ToastContext';

const EXAM_OPTIONS = [
  'JEE Main', 'JEE Advanced', 'NEET', 'BITSAT', 'COMEDK', 'VITEEE', 'SRMEEE',
  'UPSC', 'SSC', 'CAT', 'GATE', 'GRE', 'GMAT', 'IELTS', 'TOEFL',
  'Class 10 Boards', 'Class 12 Boards', 'State Entrance Exams',
];

const STUDY_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

const STUDY_PREFERENCES = [
  'Morning Study', 'Evening Study', 'Group Discussion', 'Mock Tests',
  'Note Sharing', 'Doubt Solving', 'Revision Sessions', 'Competitive Practice',
];

const FALLBACK_BUDDIES = [
  {
    id: 'demo_b1',
    name: 'Aman Verma',
    location: 'Delhi',
    studyLevel: 'Intermediate',
    bio: 'Preparing for GATE CSE 2027. Looking for consistent daily accountability.',
    examsTags: ['GATE'],
    studyPreferences: ['Evening Study', 'Mock Tests'],
  },
  {
    id: 'demo_b2',
    name: 'Ritika Das',
    location: 'Bengaluru',
    studyLevel: 'Beginner',
    bio: 'Starting JEE Main prep and need a small group for concept revision.',
    examsTags: ['JEE Main'],
    studyPreferences: ['Morning Study', 'Doubt Solving'],
  },
];

export default function ForumStudyBuddy() {
  const addToast = useToast();
  const [buddies, setBuddies] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExam, setSelectedExam] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('');

  const [showBuddyForm, setShowBuddyForm] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [buddyForm, setBuddyForm] = useState({
    bio: '',
    examsTags: [],
    studyPreferences: [],
    location: '',
    timezone: 'Asia/Kolkata',
    availableHours: [],
    currentGoals: [],
    studyLevel: 'Intermediate',
  });

  const [connectingBuddy, setConnectingBuddy] = useState(null);
  const [connectionMessage, setConnectionMessage] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'studyBuddies'), where('isActive', '==', true), limit(50));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => {
          const aTs = a?.createdAt?.seconds || 0;
          const bTs = b?.createdAt?.seconds || 0;
          return bTs - aTs;
        });
        setBuddies(list);
        setLoading(false);
      },
      () => {
        setLoading(false);
        addToast('Failed to load study buddies.', 'error');
      }
    );
    return () => unsub();
  }, [addToast]);

  const displayBuddies = useMemo(() => {
    const live = buddies.filter((b) => !String(b.id || '').startsWith('demo_'));
    return [...FALLBACK_BUDDIES, ...live];
  }, [buddies]);

  const filteredBuddies = useMemo(() => {
    let out = displayBuddies;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      out = out.filter((b) =>
        `${b.name || ''} ${b.location || ''} ${b.bio || ''}`.toLowerCase().includes(s)
      );
    }
    if (selectedExam !== 'all') {
      out = out.filter((b) =>
        (b.examsTags || []).some((exam) => exam.toLowerCase().includes(selectedExam.toLowerCase()))
      );
    }
    if (selectedLevel !== 'all') out = out.filter((b) => b.studyLevel === selectedLevel);
    if (selectedLocation) {
      out = out.filter((b) => `${b.location || ''}`.toLowerCase().includes(selectedLocation.toLowerCase()));
    }
    return out;
  }, [displayBuddies, searchTerm, selectedExam, selectedLevel, selectedLocation]);

  const updateBuddyField = (field, value) => {
    setBuddyForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleListValue = (field, value) => {
    setBuddyForm((prev) => {
      const list = prev[field];
      const exists = list.includes(value);
      return { ...prev, [field]: exists ? list.filter((v) => v !== value) : [...list, value] };
    });
  };

  const handleCreateProfile = async () => {
    const user = auth.currentUser;
    if (!user) return addToast('Please sign in to create profile.', 'error');
    if (!buddyForm.bio.trim() || buddyForm.examsTags.length === 0 || !buddyForm.location.trim()) {
      return addToast('Fill all required profile fields.', 'error');
    }

    setIsCreatingProfile(true);
    try {
      await setDoc(
        doc(db, 'studyBuddies', user.uid),
        {
          userId: user.uid,
          name: user.displayName || user.email || 'Anonymous User',
          email: user.email || '',
          avatar: user.photoURL || '',
          bio: buddyForm.bio.trim(),
          examsTags: buddyForm.examsTags,
          studyPreferences: buddyForm.studyPreferences,
          location: buddyForm.location.trim(),
          timezone: buddyForm.timezone,
          availableHours: buddyForm.availableHours,
          currentGoals: buddyForm.currentGoals.filter((g) => g.trim()),
          studyLevel: buddyForm.studyLevel,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setShowBuddyForm(false);
      addToast('Study buddy profile created.', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to create profile.', 'error');
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const handleConnect = async () => {
    const user = auth.currentUser;
    if (!user) return addToast('Please sign in to connect.', 'error');
    if (!connectingBuddy) return;
    if (!connectionMessage.trim()) return addToast('Please write a message.', 'error');

    setIsConnecting(true);
    try {
      await addDoc(collection(db, 'study_buddy_connections'), {
        senderId: user.uid,
        receiverId: connectingBuddy.id,
        senderName: user.displayName || user.email || 'Anonymous User',
        receiverName: connectingBuddy.name || 'Study Buddy',
        message: connectionMessage.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      addToast(`Request sent to ${connectingBuddy.name || 'study buddy'}.`, 'success');
      setConnectingBuddy(null);
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
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <section className="bg-white border border-blue-100 rounded-2xl shadow-sm p-6 sm:p-8 mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Study Buddy Finder</h1>
          <p className="text-gray-600 mt-3">Connect with peers preparing for the same entrance exams and study together.</p>
        </section>

        <section className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Find Study Buddies</h2>
              <p className="text-sm text-gray-600 mt-1">Filter by exam, study level, and location.</p>
            </div>
            <button onClick={() => setShowBuddyForm(true)} className="bg-white border border-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-lg hover:bg-gray-50">
              Create Profile
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-5">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, location..."
              className="border border-gray-300 rounded-lg px-3 py-2"
            />
            <select value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2">
              <option value="all">All Exams</option>
              {EXAM_OPTIONS.map((exam) => (
                <option key={exam} value={exam}>
                  {exam}
                </option>
              ))}
            </select>
            <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2">
              <option value="all">All Levels</option>
              {STUDY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
            <input
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              placeholder="Location..."
              className="border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
        </section>

        {loading ? (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((k) => (
              <div key={k} className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm animate-pulse">
                <div className="h-16 w-16 rounded-full bg-gray-200 mx-auto mb-4" />
                <div className="h-5 w-32 bg-gray-200 rounded mx-auto mb-3" />
                <div className="h-4 w-24 bg-gray-200 rounded mx-auto mb-4" />
                <div className="h-8 w-28 bg-gray-200 rounded mx-auto" />
              </div>
            ))}
          </section>
        ) : filteredBuddies.length > 0 ? (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBuddies.map((buddy) => (
              <article key={buddy.id} className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition">
                <div className="flex flex-col items-center text-center">
                  <div className="h-16 w-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xl">
                    {(buddy.name || 'U').charAt(0)}
                  </div>
                  <p className="font-bold text-gray-900 text-lg mt-3">{buddy.name}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {buddy.location || 'Unknown'} • <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">{buddy.studyLevel || 'Intermediate'}</span>
                  </p>
                  {buddy.bio && <p className="text-sm text-gray-700 mt-3 line-clamp-2">{buddy.bio}</p>}

                  <div className="mt-3 flex flex-wrap gap-1 justify-center">
                    {(buddy.examsTags || []).slice(0, 3).map((exam) => (
                      <span key={exam} className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                        {exam}
                      </span>
                    ))}
                    {(buddy.examsTags || []).length > 3 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                        +{(buddy.examsTags || []).length - 3} more
                      </span>
                    )}
                  </div>

                  {(buddy.studyPreferences || []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1 justify-center">
                      {(buddy.studyPreferences || []).slice(0, 2).map((pref) => (
                        <span key={pref} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                          {pref}
                        </span>
                      ))}
                    </div>
                  )}

                  <button onClick={() => setConnectingBuddy(buddy)} className="mt-4 w-full bg-blue-600 text-white font-semibold py-2 rounded-lg">
                    Connect
                  </button>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="bg-white border border-gray-100 rounded-xl p-10 text-center shadow-sm">
            <p className="font-semibold text-gray-900">No study buddies found</p>
            <p className="text-sm text-gray-600 mt-1">
              {searchTerm || selectedExam !== 'all' || selectedLevel !== 'all' || selectedLocation
                ? 'Try adjusting your filters.'
                : 'Be the first to create a study buddy profile.'}
            </p>
            {!searchTerm && selectedExam === 'all' && selectedLevel === 'all' && !selectedLocation && (
              <button onClick={() => setShowBuddyForm(true)} className="mt-4 bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg">
                Create Profile
              </button>
            )}
          </section>
        )}

        {showBuddyForm && (
          <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
              <h3 className="text-xl font-bold text-gray-900">Create Your Study Buddy Profile</h3>
              <p className="text-sm text-gray-600 mt-1">Let others find you for focused study sessions.</p>

              <div className="space-y-4 mt-5">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Bio *</label>
                  <textarea
                    rows={3}
                    value={buddyForm.bio}
                    onChange={(e) => updateBuddyField('bio', e.target.value)}
                    placeholder="Share your goals and study style..."
                    className="w-full border border-gray-300 rounded-lg p-3 mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Location *</label>
                    <input
                      value={buddyForm.location}
                      onChange={(e) => updateBuddyField('location', e.target.value)}
                      placeholder="e.g., Mumbai, Delhi, Online"
                      className="w-full border border-gray-300 rounded-lg p-2 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Study Level</label>
                    <select
                      value={buddyForm.studyLevel}
                      onChange={(e) => updateBuddyField('studyLevel', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 mt-1"
                    >
                      {STUDY_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Preparing For (Exams) *</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 border border-gray-200 rounded-lg p-3 max-h-36 overflow-y-auto">
                    {EXAM_OPTIONS.map((exam) => (
                      <label key={exam} className="text-sm text-gray-700 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={buddyForm.examsTags.includes(exam)}
                          onChange={() => toggleListValue('examsTags', exam)}
                        />
                        <span>{exam}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Study Preferences</label>
                  <div className="grid grid-cols-2 gap-2 mt-2 border border-gray-200 rounded-lg p-3 max-h-36 overflow-y-auto">
                    {STUDY_PREFERENCES.map((pref) => (
                      <label key={pref} className="text-sm text-gray-700 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={buddyForm.studyPreferences.includes(pref)}
                          onChange={() => toggleListValue('studyPreferences', pref)}
                        />
                        <span>{pref}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button onClick={() => setShowBuddyForm(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700">
                  Cancel
                </button>
                <button onClick={handleCreateProfile} disabled={isCreatingProfile} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50">
                  {isCreatingProfile ? 'Creating...' : 'Create Profile'}
                </button>
              </div>
            </div>
          </div>
        )}

        {connectingBuddy && (
          <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-lg p-6">
              <h3 className="text-xl font-bold text-gray-900">Connect with {connectingBuddy.name}</h3>
              <p className="text-sm text-gray-600 mt-1">Send a short intro and your study goal.</p>
              <div className="mt-4">
                <textarea
                  rows={4}
                  value={connectionMessage}
                  onChange={(e) => setConnectionMessage(e.target.value)}
                  placeholder="Hi! I am also preparing for..."
                  className="w-full border border-gray-300 rounded-lg p-3"
                />
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setConnectingBuddy(null);
                    setConnectionMessage('');
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700"
                >
                  Cancel
                </button>
                <button onClick={handleConnect} disabled={isConnecting} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50">
                  {isConnecting ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
