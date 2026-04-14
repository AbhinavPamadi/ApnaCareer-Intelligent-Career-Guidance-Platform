export function computePersonalityVector(responses, questions) {
  const traitSums = {};
  const traitCounts = {};

  for (const r of responses) {
    const q = questions.find(q => q.questionId === r.questionId);
    if (!q) continue;

    if (q.type === 'likert') {
      const value = q.reversed ? (6 - r.response) : r.response;
      const norm = (value - 1) / 4;
      if (Array.isArray(q.traitMapped)) {
        for (const t of q.traitMapped) {
          traitSums[t] = (traitSums[t] || 0) + norm;
          traitCounts[t] = (traitCounts[t] || 0) + 1;
        }
      }
    } else if (q.type === 'mcq') {
      const scoreMap = q.scoring?.[r.response];
      if (scoreMap) {
        for (const [trait, weight] of Object.entries(scoreMap)) {
          traitSums[trait] = (traitSums[trait] || 0) + (weight / 2); // normalize mapping
          traitCounts[trait] = (traitCounts[trait] || 0) + 1;
        }
      }
    } else if (q.type === 'forced_choice') {
      const selectedIndex = q.options.indexOf(r.response);
      if (selectedIndex !== -1 && q.traitMapped && q.traitMapped[selectedIndex]) {
        const trait = q.traitMapped[selectedIndex];
        traitSums[trait] = (traitSums[trait] || 0) + 1;
        traitCounts[trait] = (traitCounts[trait] || 0) + 1;
      }
    }
  }

  const personalityVector = {};
  for (const trait in traitSums) {
    personalityVector[trait] = traitSums[trait] / traitCounts[trait];
  }

  const domainPriors = mapToDomainPriors(personalityVector);
  return { personalityVector, domainPriors };
}

export function mapToDomainPriors(pv) {
  const priors = {
    dsa: 0.1 + 0.5 * (pv.analytical || 0) + 0.3 * (pv.optimization || 0) + 0.2 * (pv.attention_to_detail || 0),
    web_dev: 0.1 + 0.6 * (pv.creativity || 0) + 0.4 * (pv.execution_bias || 0),
    ml: 0.1 + 0.6 * (pv.analytical || 0) + 0.4 * (pv.creativity || 0),
    databases: 0.1 + 0.4 * (pv.systems_thinking || 0) + 0.3 * (pv.structure || 0) + 0.3 * (pv.analytical || 0),
    operating_systems: 0.1 + 0.4 * (pv.systems_thinking || 0) + 0.4 * (pv.attention_to_detail || 0) + 0.2 * (pv.optimization || 0),
    networking: 0.1 + 0.5 * (pv.systems_thinking || 0) + 0.5 * (pv.structure || 0),
    system_design: 0.1 + 0.5 * (pv.systems_thinking || 0) + 0.3 * (pv.analytical || 0) + 0.2 * (pv.structure || 0),
    security: 0.1 + 0.6 * (pv.attention_to_detail || 0) + 0.4 * (pv.structure || 0)
  };
  
  const sum = Object.values(priors).reduce((acc, val) => acc + val, 0);
  for (const key in priors) {
    priors[key] = sum > 0 ? priors[key] / sum : 1/8;
  }
  return priors;
}
