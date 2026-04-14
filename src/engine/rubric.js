export function scoreSubjective(answerText, expectedPoints = []) {
  if (!answerText) return { score: 0, isCorrect: false };
  const clean = answerText.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');
  
  if (expectedPoints.length === 0) return { score: 1.0, isCorrect: true };

  const matched = expectedPoints.filter(p => {
    const keywords = p.toLowerCase().split(' ');
    // Match if at least one significant word from the point is in the text
    return keywords.some(k => k.length > 3 && clean.includes(k));
  });

  const finalScore = matched.length / expectedPoints.length;

  return {
    score: Math.round(finalScore * 100) / 100,
    isCorrect: finalScore >= 0.5,
  };
}

export function scoreStructured(answerStructured, expectedPoints = []) {
  if (!answerStructured) return { score: 0, isCorrect: false };
  
  const sections = ['problemUnderstanding', 'approach', 'tradeoffs', 'decision'];
  const fullText = sections.map(s => answerStructured[s] || '').join(' ').toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');

  if (expectedPoints.length === 0) return { score: 1.0, isCorrect: true };

  const matched = expectedPoints.filter(p => {
    const keywords = p.toLowerCase().split(' ');
    return keywords.some(k => k.length > 3 && fullText.includes(k));
  });

  const finalScore = matched.length / expectedPoints.length;

  return {
    score: Math.round(finalScore * 100) / 100,
    isCorrect: finalScore >= 0.5,
  };
}
