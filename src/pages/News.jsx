import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';

const API_KEY = import.meta.env.VITE_NEWSDATA_API_KEY;
const BASE_URL = 'https://newsdata.io/api/1/latest';

const FILTER_OPTIONS = [
  { id: 'gate exam', label: 'Gate Exam' },
  { id: 'placements', label: 'Placements' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'internships', label: 'Internships' },
  { id: 'hiring', label: 'Hiring' },
  { id: 'hackathons', label: 'Hackathons' },
];

const FILTER_CONFIG = {
  'gate exam': { q: 'gate', category: 'education' },
  placements: { q: 'placements', category: 'business' },
  jobs: { q: 'jobs', category: 'business' },
  internships: { q: 'internships', category: 'business' },
  hiring: { q: 'hiring', category: 'business' },
  hackathons: { q: 'hackathons', category: 'technology' },
};

const ALLOWED_CATEGORIES = new Set(['business', 'technology', 'education']);

function buildQueryParams(searchTerm, selectedFilter) {
  const filterConfig = FILTER_CONFIG[selectedFilter] || FILTER_CONFIG.jobs;
  const isGate = selectedFilter === 'gate exam';
  const category = isGate ? 'education' : filterConfig.category;

  const query = isGate
    ? 'gate'
    : (searchTerm || '').trim() || filterConfig.q;

  const params = new URLSearchParams({
    apikey: API_KEY,
    q: query,
    category,
    language: 'en',
  });

  if (!ALLOWED_CATEGORIES.has(category)) {
    params.set('category', 'business');
  }

  return params;
}

export default function News() {
  const [selectedFilter, setSelectedFilter] = useState('jobs');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNews = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      if (!API_KEY) {
        throw new Error('Missing VITE_NEWSDATA_API_KEY in environment variables.');
      }

      const params = buildQueryParams(appliedSearch, selectedFilter);
      const res = await fetch(`${BASE_URL}?${params.toString()}`);

      if (!res.ok) {
        throw new Error(`Failed to fetch news (${res.status})`);
      }

      const data = await res.json();
      if (data.status !== 'success') {
        throw new Error(data.results?.message || 'News API returned an error.');
      }

      setArticles((data.results || []).slice(0, 6));
    } catch (err) {
      console.error(err);
      setError('Unable to load news right now. Please try again in a moment.');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, selectedFilter]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const headingText = useMemo(() => {
    if (selectedFilter === 'gate exam') {
      return 'Showing GATE exam news in education category only';
    }
    return `Showing ${selectedFilter} news in ${FILTER_CONFIG[selectedFilter].category} category`;
  }, [selectedFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setAppliedSearch(searchInput.trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <section className="bg-white border border-blue-100 rounded-2xl shadow-sm p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-600">Career News</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-2">Latest updates that matter</h1>
          <p className="text-gray-600 mt-3 max-w-3xl">
            Search for topics and filter by preparation-focused trends. Articles are shown in a 2-row layout with 3 cards per row.
          </p>
          <p className="text-sm font-semibold text-blue-700 mt-4">{headingText}</p>

          <form onSubmit={handleSearch} className="mt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search by keyword</label>
            <div className="flex gap-3 flex-col sm:flex-row">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Try: data science, software engineer, resume tips..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={selectedFilter === 'gate exam'}
              />
              <button
                type="submit"
                className="bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                disabled={selectedFilter === 'gate exam'}
              >
                Search
              </button>
            </div>
            {selectedFilter === 'gate exam' && (
              <p className="text-xs text-gray-500 mt-2">
                For Gate Exam filter, keyword is fixed to <span className="font-semibold">gate</span> and category is fixed to <span className="font-semibold">education</span>.
              </p>
            )}
          </form>

          <div className="mt-6">
            <p className="text-sm font-semibold text-gray-700 mb-3">Filters</p>
            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((option) => {
                const active = selectedFilter === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => setSelectedFilter(option.id)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300 hover:text-blue-700'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {loading && (
          <section className="bg-white border border-gray-100 rounded-xl p-8 text-center text-gray-600">
            Loading news articles...
          </section>
        )}

        {error && !loading && (
          <section className="bg-red-50 border border-red-200 rounded-xl p-8 text-center text-red-700 font-semibold">
            {error}
          </section>
        )}

        {!loading && !error && (
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {articles.length === 0 && (
              <article className="md:col-span-2 xl:col-span-3 bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center text-yellow-800 font-semibold">
                No articles found for this search/filter.
              </article>
            )}

            {articles.map((article) => (
              <article key={article.article_id || article.link} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden flex flex-col">
                {article.image_url ? (
                  <img
                    src={article.image_url}
                    alt={article.title || 'News article'}
                    className="w-full h-44 object-cover"
                  />
                ) : (
                  <div className="w-full h-44 bg-blue-50 flex items-center justify-center text-blue-600 font-semibold">
                    No image
                  </div>
                )}
                <div className="p-5 flex flex-col flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    {article.source_name || 'Unknown source'}
                  </p>
                  <h2 className="text-lg font-bold text-gray-900 mt-2 line-clamp-3">
                    {article.title || 'Untitled article'}
                  </h2>
                  <p className="text-gray-600 text-sm mt-3 line-clamp-3 flex-1">
                    {article.description || 'No description available.'}
                  </p>
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center justify-center bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    Read Article
                  </a>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
