import { formatDomainLabel } from '../utils/domainLabels';

const ROLE_LADDER = {
  'Software Development Engineer': {
    intern: 'SDE Intern',
    junior: 'Junior Developer',
    senior: 'Senior Software Engineer',
    lead: 'Tech Lead',
  },
  'Backend Engineer': {
    intern: 'Backend Intern',
    junior: 'Junior Backend Engineer',
    senior: 'Senior Backend Engineer',
    lead: 'Engineering Manager',
  },
  'Systems Architect': {
    intern: 'Backend Intern',
    junior: 'Software Engineer',
    senior: 'Senior Systems Engineer',
    lead: 'Systems Architect',
  },
  'Frontend Engineer': {
    intern: 'Frontend Intern',
    junior: 'Junior Frontend Engineer',
    senior: 'Senior Frontend Engineer',
    lead: 'UI Engineering Lead',
  },
  'UI/UX Engineer': {
    intern: 'Design Intern',
    junior: 'UI/UX Engineer',
    senior: 'Senior Product Designer',
    lead: 'Design Lead',
  },
  'Full Stack Developer': {
    intern: 'Full Stack Intern',
    junior: 'Junior Full Stack Developer',
    senior: 'Senior Full Stack Developer',
    lead: 'Tech Lead',
  },
  'Web Platform Engineer': {
    intern: 'Web Intern',
    junior: 'Platform Engineer',
    senior: 'Senior Platform Engineer',
    lead: 'Web Platform Lead',
  },
  'ML Engineer': {
    intern: 'ML Intern',
    junior: 'Junior ML Engineer',
    senior: 'Senior ML Engineer',
    lead: 'AI Tech Lead',
  },
  'Data Scientist': {
    intern: 'Data Science Intern',
    junior: 'Junior Data Scientist',
    senior: 'Senior Data Scientist',
    lead: 'Head of Data Science',
  },
  'AI Architect': {
    intern: 'ML Intern',
    junior: 'ML Engineer',
    senior: 'Senior ML Engineer',
    lead: 'AI Architect',
  },
  'AI/ML Researcher': {
    intern: 'Research Intern',
    junior: 'ML Engineer',
    senior: 'Research Scientist',
    lead: 'Principal Researcher',
  },
  'Data Engineer': {
    intern: 'Data Intern',
    junior: 'Junior Data Engineer',
    senior: 'Senior Data Engineer',
    lead: 'Data Architect',
  },
  'Database Administrator': {
    intern: 'DBA Intern',
    junior: 'Junior DBA',
    senior: 'Senior DBA',
    lead: 'Data Platform Lead',
  },
  'Data Architect': {
    intern: 'Data Intern',
    junior: 'Data Engineer',
    senior: 'Senior Data Engineer',
    lead: 'Data Architect',
  },
  'Systems Engineer': {
    intern: 'Systems Intern',
    junior: 'Junior Systems Engineer',
    senior: 'Senior Systems Engineer',
    lead: 'Infrastructure Lead',
  },
  'Systems Programmer': {
    intern: 'Systems Intern',
    junior: 'Systems Programmer',
    senior: 'Senior Systems Programmer',
    lead: 'Kernel / Runtime Lead',
  },
  'Core Kernel Developer': {
    intern: 'OS Intern',
    junior: 'Systems Programmer',
    senior: 'Kernel Engineer',
    lead: 'Principal Systems Engineer',
  },
  'Network Engineer': {
    intern: 'Network Intern',
    junior: 'Junior Network Engineer',
    senior: 'Senior Network Engineer',
    lead: 'Network Architect',
  },
  'Network Security Engineer': {
    intern: 'Security Intern',
    junior: 'SOC Analyst',
    senior: 'Network Security Engineer',
    lead: 'Security Architect',
  },
  'Solutions Architect': {
    intern: 'Backend Intern',
    junior: 'Software Engineer',
    senior: 'Senior Software Engineer',
    lead: 'Solutions Architect',
  },
  'AI/ML System Designer': {
    intern: 'ML Intern',
    junior: 'ML Engineer',
    senior: 'ML Platform Engineer',
    lead: 'AI Systems Architect',
  },
  'Cybersecurity Analyst': {
    intern: 'Security Intern',
    junior: 'SOC Analyst',
    senior: 'Cybersecurity Analyst',
    lead: 'Security Lead',
  },
  'Cloud Security Engineer': {
    intern: 'Cloud Intern',
    junior: 'Cloud Engineer',
    senior: 'Cloud Security Engineer',
    lead: 'Security Architect',
  },
  'DevOps Engineer': {
    intern: 'DevOps Intern',
    junior: 'Junior DevOps Engineer',
    senior: 'Senior DevOps Engineer',
    lead: 'Platform Lead',
  },
  'Cloud Infrastructure Engineer': {
    intern: 'Cloud Intern',
    junior: 'Cloud Engineer',
    senior: 'Senior Cloud Engineer',
    lead: 'Infrastructure Architect',
  },
  'Software Engineer': {
    intern: 'Software Intern',
    junior: 'Junior Developer',
    senior: 'Senior Software Engineer',
    lead: 'Tech Lead',
  },
};

const CURRENT_INDEX_BY_LEVEL = {
  Foundational: 1,
  Developing: 2,
  Proficient: 3,
  Advanced: 4,
};

function pickIntern(domain, personalityVector) {
  if ((personalityVector?.creativity || 0) >= 0.65 && domain === 'web_dev') return 'Frontend Intern';
  if ((personalityVector?.analytical || 0) >= 0.65 && (domain === 'ml' || domain === 'databases')) {
    return 'Data Science Intern';
  }
  const byDomain = {
    dsa: 'SDE Intern',
    web_dev: 'Full Stack Intern',
    ml: 'ML Intern',
    databases: 'Data Intern',
    operating_systems: 'Systems Intern',
    networking: 'Network Intern',
    system_design: 'Backend Intern',
    security: 'Security Intern',
  };
  return byDomain[domain] || 'Software Intern';
}

function dominantPersonality(personalityVector = {}) {
  const entries = Object.entries(personalityVector);
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0];
}

export function buildCareerPath(results = {}) {
  const targetRole = results.topRoles?.[0] || 'Software Engineer';
  const ladder = ROLE_LADDER[targetRole] || ROLE_LADDER['Software Engineer'];
  const internTitle = pickIntern(results.bestDomain, results.personalityVector);
  const gaps = (results.skillGaps || []).map(formatDomainLabel);
  const level = results.competencyLevel || 'Developing';
  const currentIndex = CURRENT_INDEX_BY_LEVEL[level] ?? 3;
  const matchPct = Math.round((results.domainProbabilities?.[results.bestDomain] || 0) * 100);
  const [topTrait, topTraitScore] = dominantPersonality(results.personalityVector) || [];

  const nodes = [
    {
      id: 'btech',
      title: 'B.Tech (CS / IT)',
      kind: 'education',
      detail: `Core CS plus stronger ${formatDomainLabel(results.bestDomain) || 'engineering'} coursework.`,
    },
    {
      id: 'intern',
      title: internTitle,
      kind: 'experience',
      detail: 'Apply quiz-aligned skills on a real team and ship a first project.',
    },
    {
      id: 'junior',
      title: ladder.junior,
      kind: 'role',
      detail: gaps.length
        ? `Close gaps in ${gaps.slice(0, 2).join(' and ')} while taking ownership of small features.`
        : 'Own features, write tests, and learn production habits.',
    },
    {
      id: 'target',
      title: targetRole,
      kind: 'role',
      detail: `Primary recommendation from domain match (${matchPct || 0}%) and personality signals.`,
    },
    {
      id: 'senior',
      title: ladder.senior,
      kind: 'role',
      detail: 'Lead delivery, mentor juniors, and deepen system ownership.',
    },
    {
      id: 'lead',
      title: ladder.lead,
      kind: 'role',
      detail: 'Set technical direction and multiply the team’s output.',
    },
  ];

  const marked = nodes.map((node, index) => {
    let status = 'upcoming';
    if (index < currentIndex) status = 'completed';
    else if (index === currentIndex) status = 'current';
    return { ...node, status };
  });

  const rationale = [
    `Best domain is ${formatDomainLabel(results.bestDomain) || 'Software'} at ${matchPct || 0}% match.`,
    `Competency is ${level}, so the highlighted rung is your current stage.`,
    topTrait
      ? `${formatDomainLabel(topTrait)} is your strongest personality signal (${Math.round((topTraitScore || 0) * 100)}%).`
      : 'Personality signals were used as a soft filter on intern and role flavor.',
    gaps.length
      ? `Skill-gap nodes: ${gaps.join(', ')} should be closed before the senior rung.`
      : 'No severe skill gaps were flagged; keep compounding your strongest domain.',
  ];

  const alternatives = (results.topRoles || []).slice(1).map((role) => ({
    role,
    intern: (ROLE_LADDER[role] || ladder).intern,
    lead: (ROLE_LADDER[role] || ladder).lead,
  }));

  return {
    targetRole,
    currentIndex,
    nodes: marked,
    rationale,
    alternatives,
  };
}
