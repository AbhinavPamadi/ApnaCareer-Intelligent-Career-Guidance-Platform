import { getAttributeScore } from './bkt';

export function generateResults({ bktBeliefs, personalityData, session, questionBank, answeredQuestions }) {
  const { domainBeliefs } = bktBeliefs;
  const { personalityVector } = personalityData;
  const allDomains = Object.keys(domainBeliefs);

  // Normalize beliefs into final probabilities, keeping domain scores
  const totalBelief = allDomains.reduce((sum, d) => sum + domainBeliefs[d], 0);
  const domainProbabilities = {};
  for (const domain of allDomains) {
    domainProbabilities[domain] = domainBeliefs[domain] / totalBelief;
  }

  const bestDomain = Object.entries(domainBeliefs).sort((a, b) => b[1] - a[1])[0][0];
  const bestScore = domainBeliefs[bestDomain];
  const confidenceScore = Math.min(1.0, bestScore + 0.1); // simple confidence metric based on highest peak

  let competencyLevel;
  if (bestScore >= 0.80) competencyLevel = 'Advanced';
  else if (bestScore >= 0.65) competencyLevel = 'Proficient';
  else if (bestScore >= 0.45) competencyLevel = 'Developing';
  else competencyLevel = 'Foundational';

  const waAttributes = {};
  for (const po of ['PO1', 'PO2', 'PO3', 'PO4', 'PO5', 'PO8']) {
    waAttributes[po] = getAttributeScore(po, domainBeliefs, answeredQuestions);
  }

  const skillGaps = Object.entries(domainBeliefs)
    .filter(([, belief]) => belief < 0.3)
    .map(([domain]) => domain);

  const topRoles = suggestRoles(bestDomain, domainBeliefs, personalityVector);

  return {
    bestDomain,
    competencyLevel,
    confidenceScore,
    topRoles,
    domainScores: domainBeliefs,
    domainProbabilities,
    personalityVector,
    waAttributes,
    skillGaps,
    remedialPath: session.remedialTriggered || false,
  };
}

function suggestRoles(bestDomain, domainBeliefs, personalityVector) {
  const roles = [];

  const addRole = (role) => { if (!roles.includes(role)) roles.push(role); };

  if (bestDomain === 'dsa') {
    addRole('Software Development Engineer');
    if (domainBeliefs.databases > 0.6) addRole('Backend Engineer');
    if (domainBeliefs.system_design > 0.6) addRole('Systems Architect');
  }

  if (bestDomain === 'web_dev') {
    if ((personalityVector?.creativity || 0) >= 0.6) addRole('Frontend Engineer');
    addRole('Full Stack Developer');
    if (domainBeliefs.networking > 0.5) addRole('Web Platform Engineer');
  }

  if (bestDomain === 'ml') {
    addRole('ML Engineer');
    if (domainBeliefs.dsa > 0.6) addRole('Data Scientist');
    if (domainBeliefs.system_design > 0.6) addRole('AI Architect');
  }

  if (bestDomain === 'databases') {
    addRole('Data Engineer');
    addRole('Database Administrator');
    if (domainBeliefs.ml > 0.5) addRole('Data Architect');
  }

  if (bestDomain === 'operating_systems') {
    addRole('Systems Engineer');
    addRole('Core Kernel Developer');
  }

  if (bestDomain === 'networking') {
    addRole('Network Engineer');
    if (domainBeliefs.security > 0.6) addRole('Network Security Engineer');
  }

  if (bestDomain === 'system_design') {
    addRole('Solutions Architect');
    if (domainBeliefs.ml > 0.5) addRole('AI/ML System Designer');
  }

  if (bestDomain === 'security') {
    addRole('Cybersecurity Analyst');
    if (domainBeliefs.networking > 0.5) addRole('Cloud Security Engineer');
  }

  if (roles.length === 0) roles.push('Software Engineer');
  
  return roles.slice(0, 3);
}
