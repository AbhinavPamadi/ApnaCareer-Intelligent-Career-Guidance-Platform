import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import FeedbackCard from './feedback/FeedbackCard';
import FeedbackForm from './feedback/FeedbackForm';
import { auth, db } from '../firebase';
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { useToast } from '../components/ToastContext';

const categories = ['All', 'Feature Request', 'Bug Report', 'Suggestion', 'General'];

const fallbackFeedback = [
  {
    id: 1,
    title: 'Add dark mode toggle',
    description: 'A dark mode option would help with late night prep and reduce eye strain.',
    author: 'Alex Chen',
    category: 'Feature Request',
    status: 'Under Review',
    upvotes: 15,
    downvotes: 2,
    replies: 3,
    date: '2 days ago',
  },
  {
    id: 2,
    title: 'Quiz page loading feels slow',
    description: 'The technical assessment takes too long to load when question count is high.',
    author: 'Sarah Johnson',
    category: 'Bug Report',
    status: 'In Progress',
    upvotes: 8,
    downvotes: 0,
    replies: 1,
    date: '5 days ago',
  },
  {
    id: 3,
    title: 'Please add more career paths',
    description: 'Would love to see freelancing and entrepreneurship options added to recommendations.',
    author: 'Mike Rodriguez',
    category: 'Suggestion',
    status: 'Planned',
    upvotes: 23,
    downvotes: 1,
    replies: 7,
    date: '1 week ago',
  },
];

export default function Feedback() {
  const addToast = useToast();
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newFeedback, setNewFeedback] = useState({
    title: '',
    description: '',
    category: 'Suggestion',
    author: '',
  });

  useEffect(() => {
    setLoading(true);
    setError('');
    const feedbackQuery = query(collection(db, 'feedback_reviews'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      feedbackQuery,
      (snap) => {
        const liveFeedback = snap.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            title: data.title || '',
            description: data.description || '',
            author: data.author || 'Anonymous User',
            category: data.category || 'General',
            status: data.status || 'Under Review',
            upvotes: Number(data.upvotes || 0),
            downvotes: Number(data.downvotes || 0),
            replies: Number(data.replies || 0),
            date: formatTimestamp(data.createdAt),
          };
        });
        setFeedbackList(liveFeedback);
        setLoading(false);
      },
      (snapshotError) => {
        console.error(snapshotError);
        setError('Unable to load feedback from Firebase.');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const combinedFeedback = useMemo(() => [...fallbackFeedback, ...feedbackList], [feedbackList]);

  const filteredFeedback = useMemo(
    () =>
      combinedFeedback.filter((item) => {
        const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
        const query = searchTerm.toLowerCase();
        const matchesSearch =
          item.title.toLowerCase().includes(query) || item.description.toLowerCase().includes(query);
        return matchesCategory && matchesSearch;
      }),
    [combinedFeedback, searchTerm, selectedCategory]
  );

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!newFeedback.title.trim() || !newFeedback.description.trim()) return;
    const user = auth.currentUser;
    if (!user) {
      addToast('Please sign in to submit feedback.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'feedback_reviews'), {
        title: newFeedback.title.trim(),
        description: newFeedback.description.trim(),
        author: newFeedback.author.trim() || user.displayName || user.email || 'Anonymous User',
        category: newFeedback.category,
        status: 'Under Review',
        upvotes: 0,
        downvotes: 0,
        replies: 0,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      addToast('Feedback submitted successfully.', 'success');
      setNewFeedback({ title: '', description: '', category: 'Suggestion', author: '' });
      setShowFeedbackForm(false);
    } catch (submitError) {
      console.error(submitError);
      addToast('Failed to submit feedback. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <section className="bg-white border border-blue-100 rounded-2xl shadow-sm p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-600">Feedback Forum</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-2">
            Help us improve Apna Career
          </h1>
          <p className="text-gray-600 mt-3 max-w-3xl">
            Share ideas, report issues, and request features for a better learning and career planning experience.
          </p>
        </section>

        <section className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="grid md:grid-cols-3 gap-3 flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search feedback..."
                className="md:col-span-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setShowFeedbackForm((prev) => !prev)}
              className="bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition"
            >
              {showFeedbackForm ? 'Close Form' : 'New Feedback'}
            </button>
          </div>

          {showFeedbackForm && (
            <FeedbackForm
              categories={categories}
              newFeedback={newFeedback}
              setNewFeedback={setNewFeedback}
              handleSubmitFeedback={handleSubmitFeedback}
              setShowFeedbackForm={setShowFeedbackForm}
              isSubmitting={isSubmitting}
            />
          )}
        </section>

        <section className="grid gap-4">
          {loading ? (
            [1, 2, 3].map((item) => (
              <div key={item} className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm animate-pulse">
                <div className="h-5 w-3/4 bg-gray-200 rounded mb-3" />
                <div className="h-4 w-full bg-gray-200 rounded mb-2" />
                <div className="h-4 w-2/3 bg-gray-200 rounded" />
              </div>
            ))
          ) : error ? (
            <div className="text-center py-8 text-red-700 border border-red-200 rounded-xl bg-red-50">{error}</div>
          ) : filteredFeedback.length === 0 ? (
            <div className="text-center py-8 text-gray-500 border border-dashed border-gray-200 rounded-xl bg-white">
              {combinedFeedback.length === 0
                ? 'No feedback yet. Be the first to share one.'
                : 'No feedback matched your search.'}
            </div>
          ) : (
            filteredFeedback.map((feedback) => <FeedbackCard key={feedback.id} feedback={feedback} />)
          )}
        </section>
      </main>
    </div>
  );
}

function formatTimestamp(createdAt) {
  if (!createdAt || typeof createdAt.toDate !== 'function') return 'Just now';
  const date = createdAt.toDate();
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}
