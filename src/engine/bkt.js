const P_LEARN = 0.2;
const P_GUESS = 0.2;
const P_SLIP = 0.1;

export function updateBelief(currentBelief, isCorrect) {
  let likelihood, posterior;
  if (isCorrect) {
    likelihood = currentBelief * (1 - P_SLIP) + (1 - currentBelief) * P_GUESS;
    posterior = (currentBelief * (1 - P_SLIP)) / likelihood;
  } else {
    likelihood = currentBelief * P_SLIP + (1 - currentBelief) * (1 - P_GUESS);
    posterior = (currentBelief * P_SLIP) / likelihood;
  }
  const updated = posterior + (1 - posterior) * P_LEARN;
  return Math.min(0.99, Math.max(0.01, updated));
}

export function getAttributeScore(poAttribute, domainBeliefs, answeredQuestions) {
  const relevant = answeredQuestions.filter(q => q.waAttributes?.includes(poAttribute));
  if (relevant.length === 0) return 0.5;
  const domains = [...new Set(relevant.map(q => q.domain))];
  const beliefs = domains
    .map(d => domainBeliefs[d])
    .filter(b => b !== undefined);
  if (beliefs.length === 0) return 0.5;
  return beliefs.reduce((sum, b) => sum + b, 0) / beliefs.length;
}
