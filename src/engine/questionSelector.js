export function selectNextQuestion({ questionBank, session, domainBeliefs }) {
  const { phase, questionsAnswered } = session;
  
  // 1. Determine allowed type based on Phase
  const phaseTypeMap = { 1: 'mcq', 2: 'short', 3: 'long' };
  const allowedType = phaseTypeMap[phase] || 'mcq';

  // 2. Rank domains by probability (highest belief first)
  const rankedDomains = Object.entries(domainBeliefs)
    .sort((a, b) => b[1] - a[1])
    .map(([domain]) => domain);

  // Determine allowed domains for the current phase
  let allowedDomains = [...rankedDomains];
  if (phase === 2) {
    allowedDomains = rankedDomains.slice(0, 3); // Top 2-3
  } else if (phase === 3) {
    allowedDomains = rankedDomains.slice(0, 2); // Top 1-2
  }

  // 3. Score candidates
  const candidates = questionBank.filter(q => {
    if (q.type !== allowedType) return false;
    if (questionsAnswered.includes(q.questionId)) return false;
    return true;
  });

  if (candidates.length === 0) return null; // No questions left

  // Calculate scores for candidates
  const scored = candidates.map(q => {
    const belief = domainBeliefs[q.domain] || 0.5;
    
    // Select domain based on uncertainty (prefer proximity to 0.5)
    let uncertaintyScore = 1 - Math.abs(belief - 0.5) * 2;
    
    // Fallback: If domain is not in allowed domains for Phase 2/3, slash its score
    if (!allowedDomains.includes(q.domain)) {
      uncertaintyScore *= 0.1;
    }

    const difficultyMultiplier = getDifficultyScore(q.difficulty, belief);
    
    return { q, score: uncertaintyScore * difficultyMultiplier };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].q;
}

function getDifficultyScore(difficulty, belief) {
  // If no difficulty is present, assume 1
  const diffMap = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
  const diffLvl = typeof difficulty === 'number' ? diffMap[difficulty] : difficulty;
  
  if (belief < 0.4) return diffLvl === 'Easy' ? 1.5 : diffLvl === 'Medium' ? 0.8 : 0.4;
  if (belief > 0.6) return diffLvl === 'Hard' ? 1.5 : diffLvl === 'Medium' ? 1.0 : 0.6;
  return 1.0;
}

export function isPhaseComplete(phase, sessionQuestionsAnswered, questionBank) {
  const PHASE_QUESTIONS_COUNT = { 1: 15, 2: 10, 3: 5 };
  const requiredCount = PHASE_QUESTIONS_COUNT[phase] || 10;
  
  const phaseType = { 1: 'mcq', 2: 'short', 3: 'long' }[phase];
  const answeredInPhase = sessionQuestionsAnswered.filter(qId => {
    const q = questionBank.find(qb => qb.questionId === qId);
    return q && q.type === phaseType;
  });

  return answeredInPhase.length >= requiredCount;
}
