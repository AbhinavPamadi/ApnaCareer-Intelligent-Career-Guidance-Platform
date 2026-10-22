import { formatDomainLabel } from '../utils/domainLabels';

const DOMAIN_ROADMAPS = {
  dsa: [
    { title: 'Programming Core', skills: ['C++ / Java / Python', 'Complexity analysis'] },
    { title: 'DSA Patterns', skills: ['Arrays & hashing', 'Trees, graphs, DP'] },
    { title: 'System Basics', skills: ['OOP', 'Databases', 'APIs'] },
    { title: 'Projects', skills: ['2 production-style apps', 'Git + tests'] },
    { title: 'Job Ready', skills: ['SDE interviews', 'Resume + contests'] },
  ],
  web_dev: [
    { title: 'Web Foundations', skills: ['HTML, CSS, JavaScript'] },
    { title: 'Frontend Framework', skills: ['React', 'State management'] },
    { title: 'Backend & Data', skills: ['Node APIs', 'SQL'] },
    { title: 'Projects', skills: ['Full-stack app', 'Auth + deploy'] },
    { title: 'Job Ready', skills: ['Portfolio', 'Frontend interviews'] },
  ],
  ml: [
    { title: 'Python', skills: ['Python', 'NumPy / Pandas'] },
    { title: 'SQL', skills: ['Queries', 'Data cleaning'] },
    { title: 'Machine Learning', skills: ['Classical ML', 'Evaluation'] },
    { title: 'Projects', skills: ['End-to-end ML app', 'Model card'] },
    { title: 'Job Ready', skills: ['ML interviews', 'GitHub showcase'] },
  ],
  databases: [
    { title: 'SQL Mastery', skills: ['Joins', 'Indexing', 'Normalization'] },
    { title: 'Python for Data', skills: ['ETL scripts', 'Pandas'] },
    { title: 'Warehousing', skills: ['Modeling', 'Pipelines'] },
    { title: 'Projects', skills: ['Analytics warehouse', 'Dashboards'] },
    { title: 'Job Ready', skills: ['Data interviews', 'SQL drills'] },
  ],
  operating_systems: [
    { title: 'C / Systems', skills: ['C', 'Memory & processes'] },
    { title: 'OS Internals', skills: ['Scheduling', 'File systems'] },
    { title: 'Linux Tooling', skills: ['Shell', 'Debugging'] },
    { title: 'Projects', skills: ['Kernel / runtime labs'] },
    { title: 'Job Ready', skills: ['Systems interviews'] },
  ],
  networking: [
    { title: 'Networks 101', skills: ['TCP/IP', 'DNS', 'HTTP'] },
    { title: 'Linux Networking', skills: ['Routing', 'Firewalls'] },
    { title: 'Cloud Basics', skills: ['VPC', 'Load balancing'] },
    { title: 'Projects', skills: ['Network lab', 'Monitoring'] },
    { title: 'Job Ready', skills: ['CCNA-style drills'] },
  ],
  system_design: [
    { title: 'Backend Core', skills: ['APIs', 'Databases'] },
    { title: 'Scalability', skills: ['Caching', 'Queues'] },
    { title: 'Design Practice', skills: ['LLD + HLD'] },
    { title: 'Projects', skills: ['High-traffic clone'] },
    { title: 'Job Ready', skills: ['Design interviews'] },
  ],
  security: [
    { title: 'Networks & OS', skills: ['Linux', 'TCP/IP'] },
    { title: 'App Security', skills: ['OWASP Top 10', 'Auth'] },
    { title: 'Defense', skills: ['SIEM basics', 'Threat modeling'] },
    { title: 'Projects', skills: ['Hardened app', 'Write-ups'] },
    { title: 'Job Ready', skills: ['SOC / security interviews'] },
  ],
};

const ROLE_TO_JSON_KEY = {
  'Frontend Engineer': 'frontend_engineer',
  'UI/UX Engineer': 'frontend_engineer',
  'Full Stack Developer': 'frontend_engineer',
  'Web Platform Engineer': 'frontend_engineer',
  'DevOps Engineer': 'devops_engineer',
  'Cloud Infrastructure Engineer': 'devops_engineer',
  'Data Engineer': 'data_engineer',
  'Database Administrator': 'data_engineer',
  'Data Architect': 'data_engineer',
  'Cybersecurity Analyst': 'security_engineer',
  'Cloud Security Engineer': 'security_engineer',
  'Network Security Engineer': 'security_engineer',
};

export function buildSkillRoadmap(results = {}, rolesCatalog = {}) {
  const role = results.topRoles?.[0] || 'Software Engineer';
  const domain = results.bestDomain || 'dsa';
  const catalogKey = ROLE_TO_JSON_KEY[role];
  const catalogPhases = rolesCatalog?.[catalogKey]?.phases;

  let steps = (catalogPhases || DOMAIN_ROADMAPS[domain] || DOMAIN_ROADMAPS.dsa).map((phase) => ({
    title: phase.title,
    skills: phase.skills || [],
    duration: phase.duration || '',
  }));

  const gaps = (results.skillGaps || []).map(formatDomainLabel);
  if (gaps.length) {
    steps = [
      {
        title: 'Close skill gaps',
        skills: gaps,
        duration: '2-4 weeks',
      },
      ...steps,
    ];
  }

  return {
    role,
    domainLabel: formatDomainLabel(domain),
    steps,
  };
}
