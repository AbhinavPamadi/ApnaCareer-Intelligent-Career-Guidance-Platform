const DOMAIN_LABELS = {
  web_dev: 'Web Development',
  ml: 'Machine Learning',
  system_design: 'System Design',
  dsa: 'DSA',
  security: 'Security',
  networking: 'Networking',
  operating_systems: 'Operating Systems',
  databases: 'Databases',
};

export function formatDomainLabel(key) {
  if (!key) return '';
  if (DOMAIN_LABELS[key]) return DOMAIN_LABELS[key];
  return String(key)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}
