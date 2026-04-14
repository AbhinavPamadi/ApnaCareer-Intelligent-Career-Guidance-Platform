import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const sections = [
  {
    title: 'Questions & Answers',
    description: 'Ask questions, get answers, and learn from your peers.',
    path: '/forum/q-and-a',
    cta: 'Open Q&A',
  },
  {
    title: 'Peer Mentor Matching',
    description: 'Find a college student 1-3 years senior who took a similar academic path.',
    path: '/forum/peer-mentor-matching',
    cta: 'Find Mentor',
  },
  {
    title: 'Study Buddy Finder',
    description: 'Connect with peers preparing for the same entrance exams and study together.',
    path: '/forum/study-buddy-finder',
    cta: 'Find Study Buddy',
  },
  {
    title: 'Reality Check System',
    description: 'Genuine, experience-based reviews of courses and colleges from current students and alumni.',
    path: '/forum/reality-check',
    cta: 'Read Reviews',
  },
];

export default function Forum() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <section className="bg-white border border-blue-100 rounded-2xl shadow-sm p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-600">Peer-to-Peer Forum</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-2">Learn from slightly senior students</h1>
          <p className="text-gray-600 mt-3 max-w-3xl">
            Ask questions, find mentors, discover study buddies, and read reality-check reviews before committing to a path.
          </p>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sections.map((section) => (
            <article key={section.path} className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm flex flex-col">
              <h2 className="text-xl font-bold text-gray-900 mb-3">{section.title}</h2>
              <p className="text-gray-600 mb-6 flex-1">{section.description}</p>
              <Link to={section.path} className="inline-flex items-center justify-center bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                {section.cta}
              </Link>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
