const P_INIT = 0.3;
const P_LEARN = 0.2;
const P_GUESS = 0.2;
const P_SLIP = 0.1;
const UPPER_THRESHOLD = 0.85;
const LOWER_THRESHOLD = 0.2;
const MAX_QUESTIONS_PER_CONCEPT = 4;

export { P_INIT, UPPER_THRESHOLD, LOWER_THRESHOLD, MAX_QUESTIONS_PER_CONCEPT };

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
  return Math.min(1.0, Math.max(0.0, updated));
}

export function getDomainScore(domain, conceptBeliefs, domainPriors) {
  const relevant = Object.values(conceptBeliefs).filter(c => c.domain === domain);
  if (relevant.length === 0) return domainPriors?.[domain] ?? 0.3;
  return relevant.reduce((sum, c) => sum + c.belief, 0) / relevant.length;
}

export function getAttributeScore(poAttribute, conceptBeliefs, answeredQuestions) {
  const relevant = answeredQuestions.filter(q => q.waAttributes?.includes(poAttribute));
  if (relevant.length === 0) return 0.5;
  const concepts = [...new Set(relevant.map(q => q.concept))];
  const beliefs = concepts
    .map(c => conceptBeliefs[c]?.belief)
    .filter(b => b !== undefined);
  if (beliefs.length === 0) return 0.5;
  return beliefs.reduce((sum, b) => sum + b, 0) / beliefs.length;
}

export function shouldStopConcept(concept, belief, questionsAsked) {
  if (belief >= UPPER_THRESHOLD) return 'mastered';
  if (belief <= LOWER_THRESHOLD) return 'weak';
  if (questionsAsked >= MAX_QUESTIONS_PER_CONCEPT) return 'sufficient';
  return 'continue';
}
