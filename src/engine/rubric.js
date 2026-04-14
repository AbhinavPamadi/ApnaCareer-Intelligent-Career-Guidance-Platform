export function scoreSubjective(answerText, rubric) {
  const clean = answerText.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');

  const keyCoverage = rubric.keyConcepts.filter(c => clean.includes(c)).length / rubric.keyConcepts.length;
  const supportCoverage = rubric.supportingConcepts.length > 0
    ? rubric.supportingConcepts.filter(c => clean.includes(c)).length / rubric.supportingConcepts.length
    : 0;
  const connectorsFound = rubric.logicalConnectors.filter(c => clean.includes(c)).length;
  const logicScore = Math.min(connectorsFound / 2, 1.0);
  const wordCount = answerText.trim().split(/\s+/).length;
  const completenessScore = wordCount >= rubric.minWordCount ? 1.0 : wordCount / rubric.minWordCount;

  const finalScore = keyCoverage * 0.5 + supportCoverage * 0.2 + logicScore * 0.2 + completenessScore * 0.1;

  return {
    score: Math.round(finalScore * 100) / 100,
    conceptsMatched: rubric.keyConcepts.filter(c => clean.includes(c)),
    conceptsMissed: rubric.keyConcepts.filter(c => !clean.includes(c)),
    isCorrect: finalScore >= 0.6,
  };
}

export function scoreStructured(answerStructured, rubric) {
  const sections = ['problemUnderstanding', 'approach', 'tradeoffs', 'decision'];
  const sectionScores = {};

  for (const section of sections) {
    const text = (answerStructured[section] || '').toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');
    const sectionRubric = rubric[section];
    const matched = sectionRubric.keyConcepts.filter(c => text.includes(c)).length;
    const coverage = matched / sectionRubric.keyConcepts.length;
    const wordCount = (answerStructured[section] || '').trim().split(/\s+/).length;
    const lengthPenalty = wordCount >= 15 ? 1.0 : 0.5;
    sectionScores[section] = Math.round(coverage * lengthPenalty * 100) / 100;
  }

  const finalScore = sections.reduce((sum, s) => sum + sectionScores[s] * rubric[s].weight, 0);

  return {
    score: Math.round(finalScore * 100) / 100,
    sectionScores,
    isCorrect: finalScore >= 0.55,
  };
}
