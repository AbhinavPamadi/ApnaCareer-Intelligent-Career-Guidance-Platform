import { getDomainScore, getAttributeScore } from './bkt';

export function generateResults({ bktBeliefs, personalityData, session, questionBank, answeredQuestions }) {
  const { concepts, domainBeliefs } = bktBeliefs;
  const { personalityVector, domainPriors } = personalityData;
  const allDomains = ['DSA', 'WebDev', 'ML', 'Systems'];

  const domainScores = {};
  for (const domain of allDomains) {
    domainScores[domain] = getDomainScore(domain, concepts, domainPriors);
  }

  const bestDomain = Object.entries(domainScores).sort((a, b) => b[1] - a[1])[0][0];
  const bestScore = domainScores[bestDomain];

  let competencyLevel;
  if (bestScore >= 0.80) competencyLevel = 'Advanced';
  else if (bestScore >= 0.65) competencyLevel = 'Proficient';
  else if (bestScore >= 0.45) competencyLevel = 'Developing';
  else competencyLevel = 'Foundational';

  const waAttributes = {};
  for (const po of ['PO1', 'PO2', 'PO3', 'PO4', 'PO5', 'PO8']) {
    waAttributes[po] = getAttributeScore(po, concepts, answeredQuestions);
  }

  const skillAttributes = {
    problemSolving: computeSkillFromConcepts(concepts, 'Problem Solving', answeredQuestions),
    design: computeSkillFromConcepts(concepts, 'Design', answeredQuestions),
    analysis: computeSkillFromConcepts(concepts, 'Analysis', answeredQuestions),
    communication: computeSkillFromConcepts(concepts, 'Communication', answeredQuestions),
  };

  const conceptProfile = {};
  for (const domain of allDomains) {
    conceptProfile[domain] = {};
    for (const [name, data] of Object.entries(concepts)) {
      if (data.domain === domain) {
        let status = 'Developing';
        if (data.belief >= 0.7) status = 'Strong';
        else if (data.belief < 0.4) status = 'Weak';
        conceptProfile[domain][name] = { belief: data.belief, status };
      }
    }
  }

  const skillGaps = Object.entries(concepts)
    .filter(([, data]) => data.belief < 0.4)
    .map(([name]) => name);

  const topRoles = suggestRoles(bestDomain, skillAttributes, personalityVector);

  return {
    bestDomain,
    competencyLevel,
    topRoles,
    domainScores,
    conceptProfile,
    personalityVector,
    waAttributes,
    skillAttributes,
    skillGaps,
    remedialPath: session.remedialTriggered || false,
  };
}

function computeSkillFromConcepts(concepts, skillAttribute, answeredQuestions) {
  const relevant = answeredQuestions.filter(q => q.skillAttribute === skillAttribute);
  if (relevant.length === 0) return 0.5;
  const beliefs = relevant
    .map(q => concepts[q.concept]?.belief)
    .filter(b => b !== undefined);
  if (beliefs.length === 0) return 0.5;
  return beliefs.reduce((sum, b) => sum + b, 0) / beliefs.length;
}

function suggestRoles(bestDomain, skillAttributes, personalityVector) {
  const roles = [];

  if (bestDomain === 'DSA') {
    if (skillAttributes.problemSolving >= 0.7) roles.push('Software Development Engineer');
    if (skillAttributes.analysis >= 0.7) roles.push('Backend Engineer');
    if ((personalityVector.analytical || 0) >= 0.7) roles.push('Systems Programmer');
    if (roles.length === 0) roles.push('Software Development Engineer');
  }

  if (bestDomain === 'WebDev') {
    if ((personalityVector.creativity || 0) >= 0.6) roles.push('Frontend Engineer');
    if (skillAttributes.design >= 0.65) roles.push('UI/UX Engineer');
    roles.push('Full Stack Developer');
  }

  if (bestDomain === 'ML') {
    if (skillAttributes.analysis >= 0.7) roles.push('ML Engineer');
    if (skillAttributes.problemSolving >= 0.7) roles.push('Data Scientist');
    roles.push('AI/ML Researcher');
  }

  if (bestDomain === 'Systems') {
    roles.push('Systems Engineer');
    if ((personalityVector.practical || 0) >= 0.7) roles.push('DevOps Engineer');
    if (skillAttributes.design >= 0.65) roles.push('Cloud Infrastructure Engineer');
    if (roles.length < 2) roles.push('DevOps Engineer');
  }

  return [...new Set(roles)].slice(0, 3);
}
