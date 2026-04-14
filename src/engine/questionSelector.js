import { shouldStopConcept, P_INIT, getDomainScore } from './bkt';

const BLOOM_PHASE_MAP = {
  1: ['Remember', 'Understand'],
  3: ['Apply', 'Analyze'],
  5: ['Analyze', 'Evaluate'],
  7: ['Create'],
};

export function selectNextQuestion({ questionBank, session, bktBeliefs, domainPriors }) {
  const { phase, activeDomains, questionsAnswered } = session;
  const allowedBlooms = BLOOM_PHASE_MAP[phase] || BLOOM_PHASE_MAP[1];
  const concepts = bktBeliefs.concepts || {};

  const candidates = questionBank.filter(q => {
    if (!activeDomains.includes(q.domain)) return false;
    if (questionsAnswered.includes(q.questionId)) return false;
    if (!allowedBlooms.includes(q.bloomLevel)) return false;
    const conceptData = concepts[q.concept];
    const belief = conceptData?.belief ?? P_INIT;
    const asked = conceptData?.questionsAsked ?? 0;
    const status = shouldStopConcept(q.concept, belief, asked);
    if (status !== 'continue') return false;
    return true;
  });

  if (candidates.length === 0) return null;

  const scored = candidates.map(q => {
    const belief = concepts[q.concept]?.belief ?? P_INIT;
    const uncertainty = 1 - Math.abs(belief - 0.5) * 2;
    const difficultyScore = getDifficultyScore(q.difficulty, belief);
    const priorNudge = 1 + 0.1 * (domainPriors?.[q.domain] ?? 0.4);
    return { q, score: uncertainty * difficultyScore * priorNudge };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].q;
}

function getDifficultyScore(difficulty, belief) {
  if (belief < 0.4) return difficulty === 'Easy' ? 1.2 : difficulty === 'Medium' ? 0.8 : 0.4;
  if (belief > 0.6) return difficulty === 'Hard' ? 1.2 : difficulty === 'Medium' ? 0.9 : 0.6;
  return 1.0;
}

export function checkPhaseTransition(phase, activeDomains, bktBeliefs, domainPriors) {
  const MINIMUM_THRESHOLD = 0.25;
  const concepts = bktBeliefs.concepts || {};

  const domainScores = {};
  for (const domain of activeDomains) {
    domainScores[domain] = getDomainScore(domain, concepts, domainPriors);
  }

  if (phase === 1) {
    const allBelowMin = Object.values(domainScores).every(s => s < MINIMUM_THRESHOLD);
    if (allBelowMin) return { transition: true, remedial: true };
    const top3 = getTopN(domainScores, 3);
    return { transition: true, remedial: false, newPhase: 3, newActiveDomains: top3 };
  }

  if (phase === 3) {
    const top2 = getTopN(domainScores, 2);
    return { transition: true, newPhase: 5, newActiveDomains: top2 };
  }

  if (phase === 5) {
    const top1 = getTopN(domainScores, 1);
    return { transition: true, newPhase: 7, newActiveDomains: top1 };
  }

  if (phase === 7) {
    return { transition: true, newPhase: 8, newActiveDomains: activeDomains };
  }

  return { transition: false };
}

function getTopN(scores, n) {
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([domain]) => domain);
}

export function isPhaseComplete(phase, activeDomains, bktBeliefs, questionBank, questionsAnswered) {
  const PHASE_QUESTION_MINIMUMS = { 1: 12, 3: 8, 5: 6, 7: 2 };
  const phaseAnswered = questionsAnswered.filter(qId => {
    const q = questionBank.find(q => q.questionId === qId);
    return q && BLOOM_PHASE_MAP[phase]?.includes(q.bloomLevel);
  });
  if (phaseAnswered.length < (PHASE_QUESTION_MINIMUMS[phase] ?? 4)) return false;

  const concepts = bktBeliefs.concepts || {};
  const phaseConcepts = questionBank
    .filter(q => activeDomains.includes(q.domain) && BLOOM_PHASE_MAP[phase]?.includes(q.bloomLevel))
    .map(q => q.concept);
  const uniqueConcepts = [...new Set(phaseConcepts)];

  return uniqueConcepts.every(concept => {
    const data = concepts[concept];
    if (!data) return false;
    const { belief, questionsAsked } = data;
    const status = shouldStopConcept(concept, belief, questionsAsked);
    return status !== 'continue';
  });
}
