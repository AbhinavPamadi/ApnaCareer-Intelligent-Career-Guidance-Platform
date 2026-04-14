import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';

const formatRoleName = (roleKey) =>
  roleKey
    .split('_')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');

export default function Timeline() {
  const [rolesData, setRolesData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const roleKeys = useMemo(() => Object.keys(rolesData || {}), [rolesData]);
  const [selectedRole, setSelectedRole] = useState('');

  useEffect(() => {
    async function loadRoles() {
      try {
        setLoading(true);
        const res = await fetch('/roles/roles.json', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`Failed to fetch roles (${res.status})`);
        }
        const data = await res.json();
        setRolesData(data || {});
        setSelectedRole(Object.keys(data || {})[0] || '');
      } catch (err) {
        console.error(err);
        setError('Unable to load role timelines right now.');
      } finally {
        setLoading(false);
      }
    }

    loadRoles();
  }, []);

  const selectedRoleData = rolesData?.[selectedRole];
  const phases = selectedRoleData?.phases || [];
  const hasRoles = roleKeys.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <section className="bg-white border border-blue-100 rounded-2xl shadow-sm p-6 sm:p-8 mb-8">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-600">Role Timeline</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-2">Career preparation roadmap</h1>
          <p className="text-gray-600 mt-3 max-w-2xl">
            Select a role to view a phase-wise timeline. Each phase highlights the expected duration and core skills to focus on.
          </p>
          <div className="mt-6 max-w-md">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Choose role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              disabled={!hasRoles}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {!hasRoles && <option value="">No roles found</option>}
              {roleKeys.map((key) => (
                <option key={key} value={key}>
                  {formatRoleName(key)}
                </option>
              ))}
            </select>
          </div>
        </section>

        {loading && (
          <section className="bg-white border border-gray-100 rounded-xl p-8 text-center text-gray-600">
            Loading role timelines...
          </section>
        )}

        {error && (
          <section className="bg-red-50 border border-red-200 rounded-xl p-8 text-center text-red-700 font-semibold">
            {error}
          </section>
        )}

        {!loading && !error && (
          <>
            {!hasRoles && (
              <section className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center text-yellow-800 font-semibold mb-5">
                No roles found in `roles/roles.json`. Please verify the JSON object has role keys.
              </section>
            )}
            {hasRoles && (
              <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 sm:p-8">
                <div className="space-y-1 mb-8">
                  <p className="text-sm uppercase tracking-wider font-bold text-blue-600">Learning path</p>
                  <h2 className="text-2xl font-extrabold text-gray-900">{formatRoleName(selectedRole)} timeline</h2>
                </div>

                <div className="relative">
                  <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-blue-200" />
                  <div className="space-y-8">
                    {phases.map((phase, index) => (
                      <article key={`${phase.title}-${index}`} className="relative pl-14">
                        <span className="absolute left-0 top-1 inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm shadow">
                          {index + 1}
                        </span>
                        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <h3 className="text-xl font-bold text-gray-900">{phase.title}</h3>
                            <span className="text-sm font-semibold text-blue-700 bg-white px-3 py-1 rounded-full border border-blue-100">
                              {phase.duration}
                            </span>
                          </div>
                          <ul className="mt-4 space-y-2">
                            {(phase.skills || []).map((skill) => (
                              <li key={skill} className="text-gray-700 flex items-start gap-2">
                                <span className="text-blue-600 mt-1">•</span>
                                <span>{skill}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
