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

  const pick = (...keys) => {
    for (const key of keys) {
      const value = profile?.[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
  };

  const asTextList = (items = [], fieldNames = []) => {
    return items
      .map((item) => {
        const candidate = fieldNames
          .map((field) => {
            const value = item?.[field];
            return typeof value === 'string' ? value.trim() : '';
          })
          .find(Boolean);
        return candidate || '';
      })
      .filter(Boolean)
      .slice(0, 8);
  };

  const name = pick('name', 'full_name', 'first_name', 'last_name');
  const headline = pick('headline', 'title', 'professionalHeadline', 'position');
  const summary = pick('summary', 'about', 'description', 'profileSummary', 'bio');
  const location = pick('location', 'city', 'country_name', 'country_code');
  const educationItems = Array.isArray(profile.education) ? profile.education : Array.isArray(profile.educations_details) ? profile.educations_details : [];
  const projects = Array.isArray(profile.projects) ? profile.projects : [];
  const experience = Array.isArray(profile.experience) ? profile.experience : [];
  const skills = Array.isArray(profile.skills) ? profile.skills : [];
  const certifications = Array.isArray(profile.certifications) ? profile.certifications : [];
  const awards = Array.isArray(profile.honors_and_awards) ? profile.honors_and_awards : [];

  const educationText = asTextList(educationItems, ['title', 'school', 'institution', 'degree', 'name'])
    .concat(asTextList(Array.isArray(profile.education) ? profile.education : [], ['title']))
    .filter(Boolean)
    .slice(0, 5)
    .join(' | ');

  const projectText = projects
    .slice(0, 5)
    .map((item) => {
      const title = typeof item?.title === 'string' ? item.title.trim() : typeof item?.name === 'string' ? item.name.trim() : '';
      const desc = typeof item?.description === 'string' ? item.description.trim() : '';
      return desc ? `${title}${title ? ': ' : ''}${desc.slice(0, 220)}` : title;
    })
    .filter(Boolean)
    .join(' | ');

  const experienceText = experience
    .slice(0, 4)
    .map((job) => {
      const role = typeof job?.title === 'string' ? job.title.trim() : '';
      const company = typeof job?.company === 'string' ? job.company.trim() : typeof job?.organization === 'string' ? job.organization.trim() : '';
      const desc = typeof job?.description === 'string' ? job.description.trim() : '';
      return [role, company].filter(Boolean).join(' at ') + (desc ? `: ${desc.slice(0, 220)}` : '');
    })
    .filter(Boolean)
    .join(' | ');

  const skillsText = [...skills, ...certifications].slice(0, 12).join(', ');
  const achievementText = Array.isArray(profile.honors_and_awards)
    ? profile.honors_and_awards.slice(0, 5).join(' | ')
    : Array.isArray(profile.achievements)
      ? profile.achievements.slice(0, 5).join(' | ')
      : '';

  const parts = [
    name ? `${name}${headline ? ` — ${headline}` : ''}` : headline,
    location,
    summary,
    experienceText,
    educationText,
    projectText,
    skillsText,
    achievementText,
  ].filter(Boolean);

  return parts.slice(0, 8).join('\n\n');
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
    throw new Error('The LinkedIn profile did not contain enough usable information to generate a quiz.');
  }

  return {
    sourceUrl: normalizedUrl,
    profile,
    profileSummary,
  };
}

export async function generateStage3Questions({ githubUsername, repos = [], linkedinProfileSummary = '', priorDomainBeliefs = {} }) {
  const trimmed = repos.slice(0, 8).map((r) => ({
    name: r.name,
    description: r.description,
    language: r.language,
    topics: r.topics || [],
    stars: r.stargazers_count || 0,
  }));

  const prompt = `Generate exactly 5 interview questions grounded in the selected profile data.
GitHub username: ${githubUsername || 'not provided'}
GitHub projects: ${JSON.stringify(trimmed)}
LinkedIn summary: ${linkedinProfileSummary || 'not provided'}
Prior domain beliefs: ${JSON.stringify(priorDomainBeliefs)}
Allowed domains: ${JSON.stringify(DOMAIN_KEYS)}

Goal:
- Keep GitHub as the main technical source for implementation depth, architecture, debugging, ownership, and system thinking.
- Use LinkedIn as the complementary source for internships, hackathons, certifications, projects, experience, leadership, teamwork, and broader career context.
- Mix both sources across the 5 questions instead of making the whole set LinkedIn-only or GitHub-only.
- If the same work appears in both sources, do not ask a duplicate question.
- Prefer questions that cover evidence not already visible in GitHub and add the missing context from LinkedIn.

Specific distribution requirement for the 5 questions when both sources are available:
- Exactly 2 questions must be pure GitHub questions.
- Exactly 2 questions must be pure LinkedIn questions.
- Exactly 1 question must be a mixed GitHub + LinkedIn question.
- A pure GitHub question must be grounded only in GitHub technical work, repo ownership, architecture, debugging, implementation, or system thinking.
- A pure LinkedIn question must be grounded only in LinkedIn internship, project, hackathon, certificate, leadership, teamwork, or career experience evidence.
- The mixed question must combine both GitHub and LinkedIn evidence in the same question.
- If one source is missing, keep only the valid questions available and do not invent facts.
- Do not create extra mixed or hybrid questions beyond the required 1.
- Do not repeat repository-level or project-level questions if the same work is already represented in GitHub.

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
- Questions must be project-specific, ownership-testing, and realistic.
- Focus on technical implementation, internship experience, hackathons, capstone projects, extracurricular work, team collaboration, problem-solving, and career impact.
- GitHub must remain the primary technical source for system design, debugging, architecture, code ownership, and implementation depth.
- LinkedIn should provide internships, leadership, project experience, and broader career context.
- Follow the exact distribution strictly: 2 pure GitHub, 2 pure LinkedIn, 1 mixed.
- Never produce more than 2 GitHub-only questions, more than 2 LinkedIn-only questions, or more than 1 mixed question.
- Use the strongest available evidence without inventing achievements or credentials.
- expectedPoints should be concise and concrete.`;

  const parsed = await callGroqJSON([
    { role: 'system', content: 'You are an expert technical interviewer. Return only JSON.' },
    { role: 'user', content: prompt },
  ]);

  const questions = Array.isArray(parsed?.questions) ? parsed.questions : [];
  return questions.slice(0, 5).map((q, idx) => ({
    questionId: q.questionId || `stage3_q${idx + 1}`,
    text: q.text || `Explain your professional thinking in project ${idx + 1}.`,
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
