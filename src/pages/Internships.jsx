import { useState } from 'react';
import Navbar from '../components/Navbar';

const HIDDEN_JOB_FIELDS = new Set([
  'discovery_input',
  'company_logo',
  'job_poster',
  'job_description',
  'job_description_formatted',
  'input',
]);

function formatLabel(value) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatValue(value) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    return value
      .map((item) => item && typeof item === 'object' ? JSON.stringify(item) : String(item))
      .join(', ');
  }
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function JobListing({ job }) {
  const title = job.job_title || 'Internship opportunity';
  const applicationUrl = job.apply_link || job.url;
  const metadata = Object.entries(job)
    .filter(([field, value]) => !HIDDEN_JOB_FIELDS.has(field) && value !== null && value !== undefined && value !== '');

  return (
    <article className="border-b border-gray-200 py-6 last:border-b-0">
      <div className="flex gap-4">
        {job.company_logo && (
          <img
            src={job.company_logo}
            alt=""
            loading="lazy"
            className="h-12 w-12 shrink-0 rounded border border-gray-200 object-contain bg-white"
            onError={(event) => { event.currentTarget.hidden = true; }}
          />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="mt-1 font-semibold text-gray-700">{job.company_name || 'Company not listed'}</p>
          <p className="mt-1 text-sm text-gray-600">{job.job_location || 'Location not specified'}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-gray-700">
            {job.job_employment_type && <span className="rounded border border-gray-200 px-2 py-1">{job.job_employment_type}</span>}
            {job.job_seniority_level && <span className="rounded border border-gray-200 px-2 py-1">{job.job_seniority_level}</span>}
            {job.job_posted_time && <span className="rounded border border-gray-200 px-2 py-1">{job.job_posted_time}</span>}
            {job.job_base_pay_range && <span className="rounded border border-gray-200 px-2 py-1">{job.job_base_pay_range}</span>}
          </div>
          {job.job_summary && <p className="mt-4 whitespace-pre-line text-sm leading-6 text-gray-700">{job.job_summary}</p>}

          {metadata.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold text-blue-700">Listing details</summary>
              <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {metadata.map(([field, value]) => (
                  <div key={field} className="min-w-0">
                    <dt className="text-xs font-bold uppercase text-gray-500">{formatLabel(field)}</dt>
                    <dd className="mt-1 break-words text-sm text-gray-700">
                      {field.endsWith('_url') || field === 'url' || field === 'apply_link' ? (
                        <a href={String(value)} target="_blank" rel="noreferrer" className="text-blue-700 underline">{String(value)}</a>
                      ) : formatValue(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          )}

          {applicationUrl && (
            <a
              href={applicationUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              View and apply
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export default function Internships() {
  const [location, setLocation] = useState('bangalore');
  const [keyword, setKeyword] = useState('intern');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const searchInternships = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const response = await fetch('/api/internships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location, keyword }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Unable to fetch internship listings.');
      }
      setJobs(Array.isArray(result.data) ? result.data : []);
    } catch (fetchError) {
      console.error(fetchError);
      setJobs([]);
      setError(fetchError.message || 'Unable to load internship listings right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="border-b border-gray-200 pb-6">
          <p className="text-sm font-bold uppercase text-blue-700">Career opportunities</p>
          <h1 className="mt-2 text-3xl font-extrabold">Internships</h1>
          <p className="mt-2 max-w-2xl text-gray-600">Search LinkedIn internship listings by city.</p>
        </header>

        <form onSubmit={searchInternships} className="border-b border-gray-200 py-6">
          <div className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-gray-700">
              City
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="e.g. Bengaluru"
                className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 font-normal"
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Keyword
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="e.g. intern"
                className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 font-normal"
              />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={loading} className="rounded bg-blue-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? 'Searching...' : 'Search internships'}
            </button>
          </div>
        </form>

        <section className="py-6" aria-live="polite">
          {loading && <p className="py-8 text-center text-gray-600">Searching internship listings...</p>}
          {error && !loading && <p className="my-4 rounded border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>}
          {!loading && !error && hasSearched && jobs.length === 0 && <p className="py-8 text-center text-gray-600">No internships matched these filters. Try a broader location or time range.</p>}
          {!loading && !error && jobs.length > 0 && (
            <>
              <p className="mb-2 text-sm font-semibold text-gray-600">{jobs.length} listings returned</p>
              <div className="divide-y divide-gray-200">
                {jobs.map((job, index) => (
                  <JobListing key={job.job_posting_id || job.url || `${job.company_name}-${job.job_title}-${index}`} job={job} />
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}