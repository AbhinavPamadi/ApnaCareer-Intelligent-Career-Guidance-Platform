export function computePersonalityVector(responses, questions) {
  const traitSums = {};
  const traitCounts = {};

  for (const r of responses) {
    const q = questions.find(q => q.questionId === r.questionId);
    if (!q) continue;
    const value = q.reversed ? (6 - r.response) : r.response;
    const norm = (value - 1) / 4;
    traitSums[q.traitMapped] = (traitSums[q.traitMapped] || 0) + norm;
    traitCounts[q.traitMapped] = (traitCounts[q.traitMapped] || 0) + 1;
  }

  const personalityVector = {};
  for (const trait in traitSums) {
    personalityVector[trait] = traitSums[trait] / traitCounts[trait];
  }

  const domainPriors = mapToDomainPriors(personalityVector);
  return { personalityVector, domainPriors };
}

export function mapToDomainPriors(pv) {
  return {
    DSA:     0.4 + 0.3  * (pv.analytical  || 0),
    Systems: 0.4 + 0.2  * (pv.practical   || 0) + 0.1 * (pv.analytical || 0),
    ML:      0.4 + 0.2  * (pv.analytical  || 0) + 0.1 * (pv.creativity || 0),
    WebDev:  0.4 + 0.2  * (pv.creativity  || 0) + 0.1 * (pv.practical  || 0),
  };
}
