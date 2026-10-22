import { useEffect, useMemo, useState } from 'react';
import { buildSkillRoadmap } from '../engine/skillRoadmap';

export default function SkillRoadmap({ results }) {
  const [rolesCatalog, setRolesCatalog] = useState({});

  useEffect(() => {
    let cancelled = false;
    async function loadRoles() {
      try {
        const res = await fetch('/roles/roles.json', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setRolesCatalog(data || {});
      } catch {
        if (!cancelled) setRolesCatalog({});
      }
    }
    loadRoles();
    return () => {
      cancelled = true;
    };
  }, []);

  const roadmap = useMemo(
    () => buildSkillRoadmap(results, rolesCatalog),
    [results, rolesCatalog]
  );

  return (
    <section className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <div className="border-b border-gray-100 pb-3 mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Skill Roadmap</p>
        <h3 className="text-2xl font-bold text-gray-900 mt-1">How to learn {roadmap.role}</h3>
        <p className="text-sm text-gray-500 mt-1">
          Structured learning map from your {roadmap.domainLabel} results.
        </p>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex items-stretch gap-0 min-w-[720px]">
          {roadmap.steps.map((step, index) => (
            <div key={`${step.title}-${index}`} className="flex items-center flex-1">
              <div className="w-full bg-gradient-to-b from-indigo-50 to-white border border-indigo-100 rounded-xl p-4 min-h-[150px]">
                <p className="text-xs font-black text-indigo-500">0{index + 1}</p>
                <h4 className="font-bold text-gray-900 mt-1">{step.title}</h4>
                {step.duration ? (
                  <p className="text-[11px] font-semibold text-indigo-700 mt-1">{step.duration}</p>
                ) : null}
                <ul className="mt-2 space-y-1">
                  {step.skills.slice(0, 3).map((skill) => (
                    <li key={skill} className="text-xs text-gray-600">• {skill}</li>
                  ))}
                </ul>
              </div>
              {index < roadmap.steps.length - 1 && (
                <div className="px-1 text-indigo-400 font-black text-lg">→</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
