import { useEffect, useMemo, useState } from 'react';
import Navbar from '../../components/Navbar';
import { auth, db } from '../../firebase';
import { addDoc, collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '../../components/ToastContext';

const CATEGORIES = [
  { key: 'academics', label: 'Academics' },
  { key: 'infrastructure', label: 'Infrastructure' },
  { key: 'placement', label: 'Placement' },
  { key: 'faculty', label: 'Faculty' },
  { key: 'campusLife', label: 'Campus Life' },
];

const FALLBACK_REVIEWS = [
  {
    id: 'demo_r1',
    collegeName: 'IIT Bombay',
    courseName: 'B.Tech Computer Science',
    authorName: 'Alumni Reviewer',
    authorType: 'alumni',
    graduationYear: 2023,
    rating: 4,
    content:
      'Academics and peer quality are excellent. Placement support is strong but competition is intense.',
    pros: ['Strong coding culture', 'Great alumni network'],
    cons: ['High pressure environment'],
    categories: { academics: 5, infrastructure: 4, placement: 5, faculty: 4, campusLife: 4 },
    helpful: 12,
    notHelpful: 1,
    isVerified: true,
  },
  {
    id: 'demo_r2',
    collegeName: 'NIT Surathkal',
    courseName: 'B.Tech Information Technology',
    authorName: 'Current Student',
    authorType: 'student',
    currentYear: 3,
    rating: 4,
    content:
      'Good balance of academics and campus life. Infrastructure is improving every year.',
    pros: ['Helpful seniors', 'Good clubs'],
    cons: ['Hostel internet can be inconsistent'],
    categories: { academics: 4, infrastructure: 3, placement: 4, faculty: 4, campusLife: 5 },
    helpful: 8,
    notHelpful: 2,
    isVerified: false,
  },
];

export default function ForumRealityCheck() {
  const addToast = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userInteractions, setUserInteractions] = useState({});

  const [searchTerm, setSearchTerm] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [authorTypeFilter, setAuthorTypeFilter] = useState('all');
  const [minRating, setMinRating] = useState('');

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    collegeName: '',
    courseName: '',
    rating: 5,
    content: '',
    prosText: '',
    consText: '',
    authorType: 'student',
    graduationYear: '',
    currentYear: '',
    categories: { academics: 5, infrastructure: 5, placement: 5, faculty: 5, campusLife: 5 },
  });

  useEffect(() => {
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'), limit(50));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setReviews(list);
        setLoading(false);
      },
      () => {
        setLoading(false);
        addToast('Failed to load reviews.', 'error');
      }
    );
    return () => unsub();
  }, [addToast]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const q = query(collection(db, 'review_interactions'), orderBy('createdAt', 'desc'), limit(500));
    const unsub = onSnapshot(q, (snap) => {
      const map = {};
      snap.docs.forEach((d) => {
        const x = d.data();
        if (x.userId === user.uid) map[x.reviewId] = x.isHelpful;
      });
      setUserInteractions(map);
    });
    return () => unsub();
  }, []);

  const displayReviews = useMemo(() => {
    const live = reviews.filter((r) => !String(r.id || '').startsWith('demo_'));
    return [...FALLBACK_REVIEWS, ...live];
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    let filtered = displayReviews;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          `${r.collegeName || ''}`.toLowerCase().includes(s) ||
          `${r.courseName || ''}`.toLowerCase().includes(s) ||
          `${r.content || ''}`.toLowerCase().includes(s)
      );
    }
    if (collegeFilter) filtered = filtered.filter((r) => `${r.collegeName || ''}`.toLowerCase().includes(collegeFilter.toLowerCase()));
    if (courseFilter) filtered = filtered.filter((r) => `${r.courseName || ''}`.toLowerCase().includes(courseFilter.toLowerCase()));
    if (authorTypeFilter !== 'all') filtered = filtered.filter((r) => r.authorType === authorTypeFilter);
    if (minRating) filtered = filtered.filter((r) => Number(r.rating || 0) >= Number(minRating));
    return filtered;
  }, [displayReviews, searchTerm, collegeFilter, courseFilter, authorTypeFilter, minRating]);

  const renderStars = (rating) => (
    <div className="flex items-center gap-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className={i < rating ? 'text-amber-500' : 'text-gray-300'}>
          ★
        </span>
      ))}
    </div>
  );

  const handleSubmitReview = async () => {
    const user = auth.currentUser;
    if (!user) return addToast('Please sign in to submit a review.', 'error');
    if (!reviewForm.collegeName.trim() || !reviewForm.courseName.trim() || !reviewForm.content.trim()) {
      return addToast('Please fill all required fields.', 'error');
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        collegeName: reviewForm.collegeName.trim(),
        courseName: reviewForm.courseName.trim(),
        authorId: user.uid,
        authorName: user.displayName || user.email || 'Anonymous',
        authorType: reviewForm.authorType,
        graduationYear: reviewForm.graduationYear ? Number(reviewForm.graduationYear) : null,
        currentYear: reviewForm.currentYear ? Number(reviewForm.currentYear) : null,
        rating: Number(reviewForm.rating),
        content: reviewForm.content.trim(),
        pros: reviewForm.prosText
          .split('\n')
          .map((x) => x.trim())
          .filter(Boolean),
        cons: reviewForm.consText
          .split('\n')
          .map((x) => x.trim())
          .filter(Boolean),
        categories: reviewForm.categories,
        helpful: 0,
        notHelpful: 0,
        isVerified: false,
        createdAt: serverTimestamp(),
      });
      addToast('Review submitted successfully.', 'success');
      setShowReviewForm(false);
      setReviewForm({
        collegeName: '',
        courseName: '',
        rating: 5,
        content: '',
        prosText: '',
        consText: '',
        authorType: 'student',
        graduationYear: '',
        currentYear: '',
        categories: { academics: 5, infrastructure: 5, placement: 5, faculty: 5, campusLife: 5 },
      });
    } catch (err) {
      console.error(err);
      addToast('Failed to submit review.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRateHelpfulness = async (review, isHelpful) => {
    const user = auth.currentUser;
    if (!user) return addToast('Please sign in to rate review helpfulness.', 'error');

    try {
      const interactionRef = doc(db, 'review_interactions', `${user.uid}_${review.id}`);
      const prev = userInteractions[review.id];
      let helpful = Number(review.helpful || 0);
      let notHelpful = Number(review.notHelpful || 0);
      if (prev === true) helpful = Math.max(0, helpful - 1);
      if (prev === false) notHelpful = Math.max(0, notHelpful - 1);
      if (isHelpful) helpful += 1;
      else notHelpful += 1;

      await setDoc(
        interactionRef,
        {
          userId: user.uid,
          reviewId: review.id,
          isHelpful,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
      await updateDoc(doc(db, 'reviews', review.id), { helpful, notHelpful });
      setUserInteractions((prevMap) => ({ ...prevMap, [review.id]: isHelpful }));
    } catch (err) {
      console.error(err);
      addToast('Failed to rate review helpfulness.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <section className="bg-white border border-blue-100 rounded-2xl shadow-sm p-6 sm:p-8 mb-6">
          <div className="flex justify-between items-start gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Reality Check System</h1>
              <p className="text-gray-600 mt-3">Genuine, experience-based reviews of courses and colleges from current students and alumni.</p>
            </div>
            <button onClick={() => setShowReviewForm(true)} className="bg-white border border-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-lg hover:bg-gray-50">
              Write Review
            </button>
          </div>
        </section>

        <section className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search reviews..." className="md:col-span-2 border border-gray-300 rounded-lg px-3 py-2" />
            <input value={collegeFilter} onChange={(e) => setCollegeFilter(e.target.value)} placeholder="College..." className="border border-gray-300 rounded-lg px-3 py-2" />
            <input value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} placeholder="Course..." className="border border-gray-300 rounded-lg px-3 py-2" />
            <select value={authorTypeFilter} onChange={(e) => setAuthorTypeFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2">
              <option value="all">All</option>
              <option value="student">Students</option>
              <option value="alumni">Alumni</option>
            </select>
          </div>
          <div className="mt-3 max-w-[180px]">
            <select value={minRating} onChange={(e) => setMinRating(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2">
              <option value="">Min rating</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="5">5</option>
            </select>
          </div>
        </section>

        {loading ? (
          <section className="space-y-4">
            {[1, 2, 3].map((k) => (
              <div key={k} className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm animate-pulse">
                <div className="h-6 w-48 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
                <div className="h-20 w-full bg-gray-200 rounded" />
              </div>
            ))}
          </section>
        ) : filteredReviews.length ? (
          <section className="space-y-4">
            {filteredReviews.map((review) => (
              <article key={review.id} className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-bold text-lg">{review.courseName}</h3>
                    <p className="text-gray-600">{review.collegeName}</p>
                    <div className="flex items-center gap-3 mt-2">
                      {renderStars(Number(review.rating || 0))}
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                        {review.authorType === 'alumni' ? `Alumni ${review.graduationYear || ''}` : `Year ${review.currentYear || ''}`}
                      </span>
                      {review.isVerified && <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Verified</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{review.rating}/5</div>
                    <div className="text-xs text-gray-500">Overall</div>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2 mt-4">
                  {CATEGORIES.map((category) => (
                    <div key={category.key} className="text-center">
                      <div className="text-sm font-semibold">{review.categories?.[category.key] || 0}/5</div>
                      <div className="text-xs text-gray-500">{category.label}</div>
                    </div>
                  ))}
                </div>

                <p className="text-sm leading-relaxed mt-4">{review.content}</p>

                {(review.pros?.length > 0 || review.cons?.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {review.pros?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm text-green-600 mb-2">Pros</h4>
                        <ul className="text-sm space-y-1">
                          {review.pros.map((pro, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-green-500 mt-1">•</span>
                              <span>{pro}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {review.cons?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm text-red-600 mb-2">Cons</h4>
                        <ul className="text-sm space-y-1">
                          {review.cons.map((con, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-red-500 mt-1">•</span>
                              <span>{con}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t mt-4">
                  <div className="text-xs text-gray-500">
                    by {review.authorName} • {review.createdAt?.seconds ? new Date(review.createdAt.seconds * 1000).toLocaleDateString() : 'Recently'}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRateHelpfulness(review, true)}
                      className={`px-3 py-1.5 rounded-lg text-sm border ${userInteractions[review.id] === true ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-gray-700 border-gray-200'}`}
                    >
                      👍 {Number(review.helpful || 0)}
                    </button>
                    <button
                      onClick={() => handleRateHelpfulness(review, false)}
                      className={`px-3 py-1.5 rounded-lg text-sm border ${userInteractions[review.id] === false ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-gray-700 border-gray-200'}`}
                    >
                      👎 {Number(review.notHelpful || 0)}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="bg-white border border-gray-100 rounded-xl p-10 text-center shadow-sm">
            <p className="font-semibold text-gray-900">No reviews found</p>
            <p className="text-sm text-gray-600 mt-1">
              {searchTerm || collegeFilter || courseFilter || authorTypeFilter !== 'all' || minRating
                ? 'Try adjusting your search filters.'
                : 'Be the first to write a review.'}
            </p>
            {!searchTerm && !collegeFilter && !courseFilter && authorTypeFilter === 'all' && !minRating && (
              <button onClick={() => setShowReviewForm(true)} className="mt-4 bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg">
                Write Review
              </button>
            )}
          </section>
        )}

        {showReviewForm && (
          <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
              <h3 className="text-xl font-bold text-gray-900">Write a Review</h3>
              <p className="text-sm text-gray-600 mt-1">Share your honest experience to help others.</p>

              <div className="space-y-4 mt-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">College/University *</label>
                    <input value={reviewForm.collegeName} onChange={(e) => setReviewForm((p) => ({ ...p, collegeName: e.target.value }))} className="w-full border border-gray-300 rounded-lg p-2 mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Course *</label>
                    <input value={reviewForm.courseName} onChange={(e) => setReviewForm((p) => ({ ...p, courseName: e.target.value }))} className="w-full border border-gray-300 rounded-lg p-2 mt-1" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">You are *</label>
                    <select value={reviewForm.authorType} onChange={(e) => setReviewForm((p) => ({ ...p, authorType: e.target.value }))} className="w-full border border-gray-300 rounded-lg p-2 mt-1">
                      <option value="student">Current Student</option>
                      <option value="alumni">Alumni</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">{reviewForm.authorType === 'alumni' ? 'Graduation Year' : 'Current Year'}</label>
                    <input
                      type="number"
                      value={reviewForm.authorType === 'alumni' ? reviewForm.graduationYear : reviewForm.currentYear}
                      onChange={(e) =>
                        setReviewForm((p) =>
                          p.authorType === 'alumni' ? { ...p, graduationYear: e.target.value } : { ...p, currentYear: e.target.value }
                        )
                      }
                      className="w-full border border-gray-300 rounded-lg p-2 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Overall Rating *</label>
                    <select value={String(reviewForm.rating)} onChange={(e) => setReviewForm((p) => ({ ...p, rating: Number(e.target.value) }))} className="w-full border border-gray-300 rounded-lg p-2 mt-1">
                      <option value="1">1 Star</option><option value="2">2 Stars</option><option value="3">3 Stars</option><option value="4">4 Stars</option><option value="5">5 Stars</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Your Review *</label>
                  <textarea value={reviewForm.content} onChange={(e) => setReviewForm((p) => ({ ...p, content: e.target.value }))} rows={4} className="w-full border border-gray-300 rounded-lg p-3 mt-1" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-green-700">Pros (one per line)</label>
                    <textarea value={reviewForm.prosText} onChange={(e) => setReviewForm((p) => ({ ...p, prosText: e.target.value }))} rows={3} className="w-full border border-gray-300 rounded-lg p-3 mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-red-700">Cons (one per line)</label>
                    <textarea value={reviewForm.consText} onChange={(e) => setReviewForm((p) => ({ ...p, consText: e.target.value }))} rows={3} className="w-full border border-gray-300 rounded-lg p-3 mt-1" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Category Ratings</label>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {CATEGORIES.map((category) => (
                      <div key={category.key} className="flex items-center justify-between">
                        <span className="text-sm">{category.label}</span>
                        <select
                          value={String(reviewForm.categories[category.key])}
                          onChange={(e) =>
                            setReviewForm((p) => ({
                              ...p,
                              categories: { ...p.categories, [category.key]: Number(e.target.value) },
                            }))
                          }
                          className="w-24 border border-gray-300 rounded-lg p-1.5"
                        >
                          <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button onClick={() => setShowReviewForm(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700">Cancel</button>
                <button onClick={handleSubmitReview} disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50">
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
