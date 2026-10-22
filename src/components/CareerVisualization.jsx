import { buildCareerPath } from '../engine/careerPath';

const KIND_STYLES = {
  education: 'bg-slate-800',
  experience: 'bg-indigo-600',
  role: 'bg-blue-600',
  skill: 'bg-amber-600',
};

const STATUS_RING = {
  completed: 'ring-2 ring-emerald-300',
  current: 'ring-4 ring-amber-300 scale-[1.03]',
  upcoming: 'ring-1 ring-white/20 opacity-90',
};

export default function CareerVisualization({ results }) {
  const path = buildCareerPath(results);

  return (
    <section className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-100 pb-3 mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Career Visualization</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">Your explainable career ladder</h3>
          <p className="text-sm text-gray-500 mt-1">
            Built with rule-based logic from quiz match, competency, interests, and skill gaps — not a black-box guess.
          </p>
        </div>
        <span className="text-sm font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">
          Target: {path.targetRole}
        </span>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex items-stretch min-w-[860px] gap-0">
          {path.nodes.map((node, index) => (
            <div key={node.id} className="flex items-center flex-1 min-w-[120px]">
              <div className={`relative w-full rounded-xl text-white p-3 shadow-sm transition ${KIND_STYLES[node.kind] || KIND_STYLES.role} ${STATUS_RING[node.status]}`}>
                <p className="text-[10px] uppercase tracking-wider font-bold text-white/80">{node.kind}</p>
                <p className="font-bold text-sm leading-snug mt-1">{node.title}</p>
                <p className="text-[11px] text-white/85 mt-2 leading-snug hidden lg:block">{node.detail}</p>
              </div>
              {index < path.nodes.length - 1 && (
                <div className="flex-shrink-0 w-6 h-0.5 bg-blue-300 mx-1 relative">
                  <span className="absolute -right-1 -top-1.5 text-blue-400 text-xs">▸</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-5">
          <h4 className="font-bold text-gray-900 mb-3">Why this path</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            {path.rationale.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-5">
          <h4 className="font-bold text-gray-900 mb-3">Alternate branches</h4>
          {path.alternatives.length === 0 ? (
            <p className="text-sm text-gray-600">Your top recommendation is a single clear track. Stay on this ladder unless interests shift.</p>
          ) : (
            <ul className="space-y-3">
              {path.alternatives.map((alt) => (
                <li key={alt.role} className="text-sm text-gray-700">
                  <span className="font-bold text-blue-800">{alt.role}</span>
                  <span className="block text-gray-600">{alt.intern} → {alt.role} → {alt.lead}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
