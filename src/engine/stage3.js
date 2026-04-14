const DOMAIN_KEYS = [
  'web_dev',
  'ml',
  'system_design',
  'dsa',
  'security',
  'networking',
  'operating_systems',
  'databases',
];

function getGroqConfig() {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  const model = import.meta.env.VITE_GROQ_MODEL || 'llama-3.3-70b-versatile';
  if (!apiKey) throw new Error('Missing VITE_GROQ_API_KEY');
  return { apiKey, model };
}

async function callGroqJSON(messages, { timeoutMs = 10000 } = {}) {
  const { apiKey, model } = getGroqConfig();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Groq request failed (${res.status})`);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '{}';
    return JSON.parse(content);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchGithubRepos(username) {
  const clean = (username || '').trim().replace(/^@/, '');
  if (!clean) return [];
  const res = await fetch(`https://api.github.com/users/${clean}/repos?sort=updated&per_page=30`);
  if (!res.ok) {
    throw new Error('Unable to fetch repositories. Check username or GitHub rate limit.');
  }
  const repos = await res.json();
  return repos.map((r) => ({
    id: r.id,
    name: r.name,
    full_name: r.full_name,
    html_url: r.html_url,
    description: r.description || '',
    language: r.language || 'Unknown',
    stargazers_count: r.stargazers_count || 0,
    forks_count: r.forks_count || 0,
    updated_at: r.updated_at,
    topics: Array.isArray(r.topics) ? r.topics : [],
  }));
}

export async function generateStage3Questions({ githubUsername, repos = [], priorDomainBeliefs = {} }) {
  const trimmed = repos.slice(0, 8).map((r) => ({
    name: r.name,
    description: r.description,
    language: r.language,
    topics: r.topics || [],
    stars: r.stargazers_count || 0,
  }));

  const prompt = `Generate exactly 5 interview questions grounded in the selected GitHub projects.
GitHub username: ${githubUsername}
Projects: ${JSON.stringify(trimmed)}
Prior domain beliefs: ${JSON.stringify(priorDomainBeliefs)}
Allowed domains: ${JSON.stringify(DOMAIN_KEYS)}

Return JSON:
{
  "questions": [
    {
      "questionId": "stage3_q1",
      "text": "question",
      "domain": "one of allowed domains",
      "difficulty": "moderate|deep",
      "expectedPoints": ["point1", "point2", "point3"]
    }
  ]
}

Rules:
- Questions must be project-specific and ownership-testing.
- Include implementation and design depth.
- expectedPoints should be concise and concrete.`;

  const parsed = await callGroqJSON([
    { role: 'system', content: 'You are an expert technical interviewer. Return only JSON.' },
    { role: 'user', content: prompt },
  ]);

  const questions = Array.isArray(parsed?.questions) ? parsed.questions : [];
  return questions.slice(0, 5).map((q, idx) => ({
    questionId: q.questionId || `stage3_q${idx + 1}`,
    text: q.text || `Explain design choices in project ${idx + 1}.`,
    domain: DOMAIN_KEYS.includes(q.domain) ? q.domain : 'system_design',
    difficulty: q.difficulty || 'moderate',
    expectedPoints: Array.isArray(q.expectedPoints) ? q.expectedPoints.slice(0, 4) : [],
  }));
}

export async function evaluateStage3Answer({ question, answerText, repoContext = [] }) {
  if (!answerText || !answerText.trim()) {
    return {
      score: 0,
      isCorrect: false,
      domainConfidence: { [question.domain]: 0 },
      feedback: 'No answer provided.',
    };
  }

  const prompt = `Evaluate this answer for correctness, depth, and practical ownership.
Question: ${question.text}
Question domain: ${question.domain}
Expected points: ${JSON.stringify(question.expectedPoints || [])}
Repo context: ${JSON.stringify(repoContext.slice(0, 5))}
Answer: ${answerText}
Allowed domains: ${JSON.stringify(DOMAIN_KEYS)}

Return JSON:
{
  "score": number,
  "feedback": "short feedback",
  "isCorrect": boolean,
  "domainConfidence": {
    "web_dev": number,
    "ml": number,
    "system_design": number,
    "dsa": number,
    "security": number,
    "networking": number,
    "operating_systems": number,
    "databases": number
  }
}

Rules:
- score range: 0 to 1.
- domainConfidence values range: 0 to 1.
- Higher confidence for domains strongly demonstrated in answer.
- Do not include text outside JSON.`;

  const parsed = await callGroqJSON([
    { role: 'system', content: 'You are a strict evaluator. Return only JSON.' },
    { role: 'user', content: prompt },
  ]);

  const score = Math.max(0, Math.min(1, Number(parsed?.score || 0)));
  const domainConfidence = {};
  for (const d of DOMAIN_KEYS) {
    domainConfidence[d] = Math.max(0, Math.min(1, Number(parsed?.domainConfidence?.[d] || 0)));
  }

  return {
    score: Math.round(score * 100) / 100,
    isCorrect: typeof parsed?.isCorrect === 'boolean' ? parsed.isCorrect : score >= 0.5,
    feedback: parsed?.feedback || '',
    domainConfidence,
  };
}

export function blendDomainScores(stage2Scores = {}, stage3Scores = {}, stage3Weight = 0.35) {
  const clampedWeight = Math.max(0, Math.min(1, stage3Weight));
  const result = {};
  for (const d of DOMAIN_KEYS) {
    const s2 = Number(stage2Scores[d] ?? 0.125);
    const s3 = Number(stage3Scores[d] ?? s2);
    result[d] = Number(((1 - clampedWeight) * s2 + clampedWeight * s3).toFixed(4));
  }
  return result;
}

export function averageDomainConfidence(evaluations = []) {
  const sums = Object.fromEntries(DOMAIN_KEYS.map((d) => [d, 0]));
  const n = evaluations.length || 1;
  for (const ev of evaluations) {
    for (const d of DOMAIN_KEYS) {
      sums[d] += Number(ev?.domainConfidence?.[d] || 0);
    }
  }
  const avg = {};
  for (const d of DOMAIN_KEYS) avg[d] = Number((sums[d] / n).toFixed(4));
  return avg;
}

export function averageScore(items = [], field = 'score') {
  if (!items.length) return 0;
  const sum = items.reduce((acc, it) => acc + Number(it?.[field] || 0), 0);
  return Number((sum / items.length).toFixed(4));
}
