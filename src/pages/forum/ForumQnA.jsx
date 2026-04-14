import { useEffect, useMemo, useState } from 'react';
import Navbar from '../../components/Navbar';
import { auth, db } from '../../firebase';
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { useToast } from '../../components/ToastContext';

const COMMON_TAGS = [
  'Academic', 'Career', 'College', 'Entrance Exam', 'Study Tips',
  'Time Management', 'Scholarships', 'Placement', 'Internship', 'Skills',
  'Engineering', 'Medical', 'Commerce', 'Arts', 'Science',
];

const FALLBACK_QUESTIONS = [
  {
    id: 'demo_q1',
    title: 'How should I balance DSA and development projects in 2nd year?',
    content: 'I have 2 hours daily. Should I split evenly or alternate days?',
    tags: ['Career', 'Skills', 'Placement'],
    anonymous: true,
    userName: 'Anonymous',
    answersCount: 3,
  },
  {
    id: 'demo_q2',
    title: 'Best strategy for internship applications in tier-2 colleges?',
    content: 'What matters most: projects, coding rounds, or referrals?',
    tags: ['Internship', 'College', 'Study Tips'],
    anonymous: false,
    userName: 'Rohit S',
    answersCount: 5,
  },
];

export default function ForumQnA() {
  const addToast = useToast();
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTag, setCustomTag] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeFilterTags, setActiveFilterTags] = useState([]);

  useEffect(() => {
    setLoading(true);
    setError('');
    const q = query(collection(db, 'forum_questions'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setQuestions(list);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError('Failed to load questions.');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const displayQuestions = useMemo(() => {
    const live = questions.filter((q) => !String(q.id || '').startsWith('demo_'));
    return [...FALLBACK_QUESTIONS, ...live];
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    if (!activeFilterTags.length) return displayQuestions;
    return displayQuestions.filter((q) => activeFilterTags.some((tag) => (q.tags || []).includes(tag)));
  }, [displayQuestions, activeFilterTags]);

  const toggleFilterTag = (tag) => {
    setActiveFilterTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const addTag = (tag) => {
    if (!selectedTags.includes(tag) && selectedTags.length < 5) {
      setSelectedTags((prev) => [...prev, tag]);
    }
  };

  const removeTag = (tag) => setSelectedTags((prev) => prev.filter((t) => t !== tag));

  const addCustomTag = () => {
    const t = customTag.trim();
    if (!t) return;
    if (!selectedTags.includes(t) && selectedTags.length < 5) {
      setSelectedTags((prev) => [...prev, t]);
    }
    setCustomTag('');
  };

  const handleSubmit = async () => {
    const user = auth.currentUser;
    if (!user) return addToast('Please sign in to ask a question.', 'error');
    if (!title.trim() || !content.trim()) return addToast('Please provide both title and details.', 'error');
    if (!selectedTags.length) return addToast('Add at least one tag.', 'error');

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'forum_questions'), {
        title: title.trim(),
        content: content.trim(),
        tags: selectedTags,
        anonymous,
        userId: user.uid,
        userName: user.displayName || user.email || 'Anonymous User',
        answersCount: 0,
        createdAt: serverTimestamp(),
      });
      addToast('Question posted successfully.', 'success');
      setTitle('');
      setContent('');
      setSelectedTags([]);
      setCustomTag('');
      setAnonymous(false);
      setShowQuestionForm(false);
    } catch (err) {
      console.error(err);
      addToast('Failed to post question. Try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <section className="bg-white border border-blue-100 rounded-2xl shadow-sm p-6 sm:p-8 mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Questions & Answers</h1>
          <p className="text-gray-600 mt-3">Ask questions, get answers, and learn from your peers.</p>
          <button
            onClick={() => setShowQuestionForm((v) => !v)}
            className="mt-4 bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg"
          >
            {showQuestionForm ? 'Close' : 'Ask a Question'}
          </button>
        </section>

        {showQuestionForm && (
          <section className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm mb-6">
            <h2 className="text-xl font-bold text-gray-900">Ask a Question</h2>
            <p className="text-sm text-gray-600 mt-1">Ask openly, and optionally stay anonymous.</p>

            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Question Title *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  placeholder="e.g., How much time should I dedicate to competitive programming?"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Question Details *</label>
                <textarea
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={2000}
                  placeholder="Provide details so seniors can answer better."
                  className="w-full border border-gray-300 rounded-lg p-3"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Tags * (up to 5)</label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => (selectedTags.includes(tag) ? removeTag(tag) : addTag(tag))}
                      className={`text-xs px-2 py-1 rounded-full border ${
                        selectedTags.includes(tag)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-gray-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 mt-3">
                  <input
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomTag();
                      }
                    }}
                    placeholder="Add custom tag..."
                    disabled={selectedTags.length >= 5}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                  />
                  <button
                    type="button"
                    onClick={addCustomTag}
                    disabled={!customTag.trim() || selectedTags.length >= 5}
                    className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>

                {selectedTags.length > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-600 mb-2">Selected tags</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-xs px-2 py-1 rounded-full bg-blue-600 text-white"
                        >
                          {tag} ×
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <label className="text-sm text-gray-700 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                  />
                  Ask anonymously
                </label>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !title.trim() || !content.trim() || selectedTags.length === 0}
                  className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {isSubmitting ? 'Posting...' : 'Post Question'}
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-lg font-bold text-gray-900">Filter by tags</h3>
            {activeFilterTags.length > 0 && (
              <button
                onClick={() => setActiveFilterTags([])}
                className="text-sm text-blue-700 font-semibold"
              >
                Clear filters
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {COMMON_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleFilterTag(tag)}
                className={`text-xs px-2 py-1 rounded-full border ${
                  activeFilterTags.includes(tag)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-100 text-gray-700 border-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <section className="space-y-4">
            {[1, 2, 3].map((k) => (
              <div key={k} className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm animate-pulse">
                <div className="h-5 w-3/4 bg-gray-200 rounded mb-3" />
                <div className="h-4 w-full bg-gray-200 rounded mb-2" />
                <div className="h-4 w-2/3 bg-gray-200 rounded" />
              </div>
            ))}
          </section>
        ) : error ? (
          <section className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-700 font-semibold">{error}</p>
          </section>
        ) : (
          <section className="space-y-4">
            {filteredQuestions.length ? (
              filteredQuestions.map((q) => (
                <article key={q.id} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                  <p className="font-bold text-gray-900 text-lg">{q.title}</p>
                  <p className="text-sm text-gray-700 mt-2">{q.content}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(q.tags || []).map((tag) => (
                      <span key={tag} className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    {(q.anonymous ? 'Anonymous' : q.userName || 'User')} • {Number(q.answersCount || 0)} answers
                  </p>
                </article>
              ))
            ) : (
              <article className="bg-white border border-gray-100 rounded-xl p-8 shadow-sm text-center">
                <p className="font-semibold text-gray-900">No questions found</p>
                <p className="text-sm text-gray-600 mt-1">
                  {activeFilterTags.length
                    ? 'No questions match current filters.'
                    : 'Be the first to ask a question in this forum.'}
                </p>
                {!activeFilterTags.length && (
                  <button
                    onClick={() => setShowQuestionForm(true)}
                    className="mt-4 bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg"
                  >
                    Ask First Question
                  </button>
                )}
              </article>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
