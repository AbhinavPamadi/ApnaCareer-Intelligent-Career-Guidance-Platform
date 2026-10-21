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

function normalizeLinkedInProfile(profile) {
  if (!profile || typeof profile !== 'object') return '';

  const collectItems = (...values) => values.flatMap((value) => {
    if (Array.isArray(value)) return value;
    return typeof value === 'string' && value.trim() ? [value] : [];
  });
  const formatItems = (items, fields) => items
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (!item || typeof item !== 'object') return '';
      return fields
        .map((field) => item[field])
        .filter((value) => typeof value === 'string' && value.trim())
        .map((value) => value.trim())
        .filter((value, index, allValues) => allValues.indexOf(value) === index)
        .join(' | ');
    })
    .filter(Boolean)
    .slice(0, 8);

  const experience = collectItems(profile.experience, profile.experiences, profile.positions);
  const internships = collectItems(profile.internships, profile.internship_experience)
    .concat(experience.filter((item) => {
      if (typeof item === 'string') return /\bintern(ship)?\b/i.test(item);
      const role = [item?.title, item?.role, item?.employment_type, item?.employmentType]
        .filter((value) => typeof value === 'string')
        .join(' ');
      return /\bintern(ship)?\b/i.test(role);
    }));
  const otherExperience = experience.filter((item) => !internships.includes(item));
  const licensesAndCertifications = collectItems(
    profile.licenses_and_certifications,
    profile.licensesAndCertifications,
    profile.licenses,
    profile.certifications
  );
  const publications = collectItems(profile.publications, profile.published_works, profile.papers);

  const sections = [
    ['Internships', formatItems(internships, ['title', 'role', 'company', 'organization', 'employment_type', 'start_date', 'end_date', 'description'])],
    ['Experience', formatItems(otherExperience, ['title', 'role', 'company', 'organization', 'employment_type', 'start_date', 'end_date', 'description'])],
    ['Licenses and certifications', formatItems(licensesAndCertifications, ['title', 'name', 'license_name', 'issuer', 'authority', 'organization', 'issue_date', 'expiration_date', 'license_number'])],
    ['Publications', formatItems(publications, ['title', 'name', 'publisher', 'publication_date', 'date', 'description', 'url'])],
  ];

  return sections
    .filter(([, items]) => items.length)
    .map(([label, items]) => `${label}: ${items.join(' | ')}`)
    .join('\n\n');
}

export async function fetchLinkedinProfile(url) {
  const normalizedUrl = (url || '').trim();
  if (!normalizedUrl) throw new Error('LinkedIn profile URL is required.');

  const response = await fetch('/api/linkedin-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: normalizedUrl }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Unable to fetch LinkedIn profile data right now.');
  }

  if (!data?.success) {
    throw new Error('LinkedIn profile data could not be fetched.');
  }

  const profile = data.data || {};
  if (!profile || typeof profile !== 'object') {
    throw new Error('LinkedIn profile response was empty or malformed.');
  }

  const profileSummary = normalizeLinkedInProfile(profile);
  if (!profileSummary) {
    throw new Error('No internship, professional experience, license/certification, or publication details were found in this LinkedIn profile. Add those details publicly or skip Stage 4.');
  }

  return {
    sourceUrl: normalizedUrl,
    profile,
    profileSummary,
  };
}

export async function generateStage3Questions({ source, githubUsername, repos = [], linkedinProfileSummary = '', priorDomainBeliefs = {} }) {
  if (source !== 'github' && source !== 'linkedin') {
    throw new Error('Choose GitHub or LinkedIn as the question source.');
  }
  const questionCount = source === 'linkedin' ? 3 : 5;

  const trimmed = repos.slice(0, 8).map((r) => ({
    name: r.name,
    description: r.description,
    language: r.language,
    topics: r.topics || [],
    stars: r.stargazers_count || 0,
  }));

  const prompt = source === 'github'
    ? `Generate exactly 5 interview questions grounded in the selected GitHub projects.
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
- expectedPoints should be concise and concrete.`
  : `Generate exactly ${questionCount} distinct interview questions grounded only in these LinkedIn profile sections.
LinkedIn profile summary: ${linkedinProfileSummary || 'not provided'}
Prior domain beliefs: ${JSON.stringify(priorDomainBeliefs)}
Allowed domains: ${JSON.stringify(DOMAIN_KEYS)}

Focus exclusively on internships, professional experience, licenses and certifications, and publications. Ask specific follow-up questions about the candidate's responsibilities, contributions, tools, outcomes, learning, credential scope, or publication process where supported by the provided evidence. Do not ask about projects, education, skills, or other profile sections; do not mention GitHub or invent details. If a category has no evidence, use the other included categories instead.

Return JSON with a questions array containing exactly ${questionCount} questions. Each question must have questionId, text, domain, difficulty, and concise expectedPoints. Use realistic, specific, ownership-testing questions and vary their focus.`;

  const messages = [
    { role: 'system', content: 'You are an expert technical interviewer. Return only JSON.' },
    { role: 'user', content: prompt },
  ];

  let parsed = await callGroqJSON(messages);
  let questions = Array.isArray(parsed?.questions) ? parsed.questions : [];
  if (questions.length !== questionCount) {
    parsed = await callGroqJSON([
      ...messages,
      { role: 'assistant', content: JSON.stringify(parsed) },
      { role: 'user', content: `The previous response had ${questions.length} questions. Return exactly ${questionCount} distinct questions in the required JSON structure, using only the ${source} evidence.` },
    ]);
    questions = Array.isArray(parsed?.questions) ? parsed.questions : [];
  }
  if (questions.length !== questionCount) {
    throw new Error(`Could not generate all ${questionCount} ${source} questions. Please try again.`);
  }

  return questions.map((q, idx) => ({
    questionId: source === 'github'
      ? q.questionId || `stage3_q${idx + 1}`
      : `linkedin_stage3_q${idx + 1}`,
    source,
    text: q.text || (source === 'github'
      ? `Explain design choices in project ${idx + 1}.`
      : `Explain your experience with the LinkedIn profile evidence in question ${idx + 1}.`),
    domain: DOMAIN_KEYS.includes(q.domain) ? q.domain : 'system_design',
    difficulty: q.difficulty || 'moderate',
    expectedPoints: Array.isArray(q.expectedPoints) ? q.expectedPoints.slice(0, 4) : [],
  }));
}

export async function evaluateStage3Answer({ question, answerText, repoContext = [], linkedinContext = '' }) {
  if (!answerText || !answerText.trim()) {
    return {
      score: 0,
      isCorrect: false,
      domainConfidence: { [question.domain]: 0 },
      feedback: 'No answer provided.',
    };
  }

  const context = question.source === 'linkedin'
    ? `LinkedIn profile context: ${linkedinContext || 'not provided'}`
    : `Repo context: ${JSON.stringify(repoContext.slice(0, 5))}`;
  const prompt = `Evaluate this answer for correctness, depth, and practical ownership.
Question: ${question.text}
Question domain: ${question.domain}
Expected points: ${JSON.stringify(question.expectedPoints || [])}
${context}
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
