function keywordScoreFromText(text, expectedPoints = []) {
  if (!text) return { score: 0, isCorrect: false };
  const clean = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');

  if (expectedPoints.length === 0) return { score: 1.0, isCorrect: true };

  const matched = expectedPoints.filter((p) => {
    const keywords = p.toLowerCase().split(' ');
    return keywords.some((k) => k.length > 3 && clean.includes(k));
  });

  const finalScore = matched.length / expectedPoints.length;
  return {
    score: Math.round(finalScore * 100) / 100,
    isCorrect: finalScore >= 0.5,
  };
}

async function scoreWithGroq({ questionText = '', answerText = '', expectedPoints = [], type = 'short' }) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  const model = import.meta.env.VITE_GROQ_MODEL || 'llama-3.3-70b-versatile';

  if (!apiKey) throw new Error('Missing VITE_GROQ_API_KEY');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  const prompt = `You are evaluating a student's ${type} answer.
Question: ${questionText}
Expected points: ${JSON.stringify(expectedPoints)}
Student answer: ${answerText}

Return only valid JSON:
{
  "score": number,
  "conceptsMatched": string[],
  "conceptsMissed": string[]
}

Rules:
- score must be between 0 and 1
- evaluate semantic correctness, not exact wording
- keep conceptsMatched and conceptsMissed aligned with expected points`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You are a strict evaluator returning only JSON.' },
          { role: 'user', content: prompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`Groq API failed with status ${response.status}`);
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    const score = Math.max(0, Math.min(1, Number(parsed.score || 0)));
    return {
      score: Math.round(score * 100) / 100,
      isCorrect: score >= 0.5,
      conceptsMatched: Array.isArray(parsed.conceptsMatched) ? parsed.conceptsMatched : [],
      conceptsMissed: Array.isArray(parsed.conceptsMissed) ? parsed.conceptsMissed : [],
      source: 'groq',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function scoreSubjective(answerText, expectedPoints = [], questionText = '') {
  if (!answerText) return { score: 0, isCorrect: false };

  try {
    return await scoreWithGroq({
      questionText,
      answerText,
      expectedPoints,
      type: 'short',
    });
  } catch {
    return {
      ...keywordScoreFromText(answerText, expectedPoints),
      source: 'keyword_fallback',
    };
  }
}

export async function scoreStructured(answerStructured, expectedPoints = [], questionText = '') {
  if (!answerStructured) return { score: 0, isCorrect: false };

  const sections = ['problemUnderstanding', 'approach', 'tradeoffs', 'decision'];
  const fullText =
    typeof answerStructured === 'string'
      ? answerStructured
      : sections.map((s) => answerStructured[s] || '').join(' ');

  try {
    return await scoreWithGroq({
      questionText,
      answerText: fullText,
      expectedPoints,
      type: 'long',
    });
  } catch {
    return {
      ...keywordScoreFromText(fullText, expectedPoints),
      source: 'keyword_fallback',
    };
  }
}
