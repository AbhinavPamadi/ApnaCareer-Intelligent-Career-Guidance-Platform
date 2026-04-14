# Antigravity Prompt Sequence
## Engineering Career Assessment System

Send these prompts ONE BY ONE. Wait for each to complete before sending the next.

---

---
## PROMPT 1 — Project Scaffold & Firebase Setup
---

Build the base scaffold for a React + Vite web application called "Engineering Career Assessment System".

### Tech stack
- React + Vite
- Firebase Authentication (Email/Password + Google)
- Firebase Firestore
- Firebase Hosting
- No backend. No Cloud Functions. No Node/Express server.

### Create this exact folder structure

```
/
├── src/
│   ├── pages/
│   │   ├── Landing.jsx         (empty placeholder)
│   │   ├── Auth.jsx            (empty placeholder)
│   │   ├── Dashboard.jsx       (empty placeholder)
│   │   ├── Personality.jsx     (empty placeholder)
│   │   ├── QuizIntro.jsx       (empty placeholder)
│   │   ├── Quiz.jsx            (empty placeholder)
│   │   └── Results.jsx         (empty placeholder)
│   ├── components/             (empty folder, add .gitkeep)
│   ├── engine/
│   │   ├── bkt.js              (empty placeholder)
│   │   ├── rubric.js           (empty placeholder)
│   │   ├── questionSelector.js (empty placeholder)
│   │   ├── personality.js      (empty placeholder)
│   │   └── resultGenerator.js  (empty placeholder)
│   ├── data/
│   │   ├── questionBank.js     (empty placeholder)
│   │   └── personalityQuestions.js (empty placeholder)
│   ├── firebase.js
│   └── App.jsx
├── questionnaire/
│   ├── personality_questions.json   (create with 3 sample questions matching schema below)
│   └── quiz/
│       ├── dsa_questions.json       (create with 3 sample questions matching schema below)
│       ├── webdev_questions.json    (create with 3 sample questions matching schema below)
│       ├── ml_questions.json        (create with 3 sample questions matching schema below)
│       └── systems_questions.json   (create with 3 sample questions matching schema below)
├── .env.example
├── firebase.json
└── vite.config.js
```

### src/firebase.js — implement exactly this

```js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

export const auth = getAuth(app);
export const db = getFirestore(app);
```

### src/data/questionBank.js — implement exactly this

```js
import dsaQuestions from '../../questionnaire/quiz/dsa_questions.json';
import webdevQuestions from '../../questionnaire/quiz/webdev_questions.json';
import mlQuestions from '../../questionnaire/quiz/ml_questions.json';
import systemsQuestions from '../../questionnaire/quiz/systems_questions.json';

export const questionBank = [
  ...dsaQuestions,
  ...webdevQuestions,
  ...mlQuestions,
  ...systemsQuestions,
];
```

### src/data/personalityQuestions.js — implement exactly this

```js
import data from '../../questionnaire/personality_questions.json';
export const personalityQuestions = data;
```

### Sample question schema for JSON files

Each quiz question (dsa_questions.json, etc.):
```json
[
  {
    "questionId": "q_dsa_001",
    "domain": "DSA",
    "concept": "BinarySearch",
    "bloomLevel": "Remember",
    "difficulty": "Easy",
    "waAttributes": ["PO1"],
    "skillAttribute": "Problem Solving",
    "type": "MCQ",
    "text": "What is the time complexity of binary search?",
    "options": ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
    "correctIndex": 1,
    "rubric": null
  }
]
```

Each personality question (personality_questions.json):
```json
[
  {
    "questionId": "p_001",
    "text": "I enjoy breaking down complex problems into smaller parts.",
    "type": "likert",
    "traitMapped": "analytical",
    "reversed": false,
    "order": 1
  }
]
```

### App.jsx — set up React Router with these routes

```
/               → Landing
/auth           → Auth
/dashboard      → Dashboard (protected)
/personality    → Personality (protected)
/quiz/intro     → QuizIntro (protected)
/quiz           → Quiz (protected)
/results        → Results (protected)
```

Protected routes: redirect to /auth if user is not logged in (use Firebase onAuthStateChanged).

### .env.example
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Install these dependencies
- firebase
- react-router-dom
- recharts (for charts on Results page later)

### Do NOT
- Create any Firestore collections for questions
- Create load_questions.js
- Use Cloud Functions
- Read questions from Firestore anywhere in the app

---

---
## PROMPT 2 — Engine Layer (Pure JS Logic)
---

Implement the five engine files in `/src/engine/`. These are pure JavaScript modules with zero React imports.

---

### src/engine/bkt.js

```js
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
```

---

### src/engine/rubric.js

```js
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
```

---

### src/engine/questionSelector.js

```js
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
```

---

### src/engine/personality.js

```js
export function computePersonalityVector(responses, questions) {
  const traitSums = {};
  const traitCounts = {};

  for (const r of responses) {
    const q = questions.find(q => q.questionId === r.questionId);
    if (!q) continue;
    const value = q.reversed ? (6 - r.response) : r.response;
    const norm = (value - 1) / 4;
    traitSums[q.traitMapped] = (traitSums[q.traitMapped] || 0) + norm;
    traitCounts[q.traitMapped] = (traitCounts[q.traitMapped] || 0) + 1;
  }

  const personalityVector = {};
  for (const trait in traitSums) {
    personalityVector[trait] = traitSums[trait] / traitCounts[trait];
  }

  const domainPriors = mapToDomainPriors(personalityVector);
  return { personalityVector, domainPriors };
}

export function mapToDomainPriors(pv) {
  return {
    DSA:     0.4 + 0.3  * (pv.analytical  || 0),
    Systems: 0.4 + 0.2  * (pv.practical   || 0) + 0.1 * (pv.analytical || 0),
    ML:      0.4 + 0.2  * (pv.analytical  || 0) + 0.1 * (pv.creativity || 0),
    WebDev:  0.4 + 0.2  * (pv.creativity  || 0) + 0.1 * (pv.practical  || 0),
  };
}
```

---

### src/engine/resultGenerator.js

```js
import { getDomainScore, getAttributeScore } from './bkt';

export function generateResults({ bktBeliefs, personalityData, session, questionBank, answeredQuestions }) {
  const { concepts, domainBeliefs } = bktBeliefs;
  const { personalityVector, domainPriors } = personalityData;
  const allDomains = ['DSA', 'WebDev', 'ML', 'Systems'];

  const domainScores = {};
  for (const domain of allDomains) {
    domainScores[domain] = getDomainScore(domain, concepts, domainPriors);
  }

  const bestDomain = Object.entries(domainScores).sort((a, b) => b[1] - a[1])[0][0];
  const bestScore = domainScores[bestDomain];

  let competencyLevel;
  if (bestScore >= 0.80) competencyLevel = 'Advanced';
  else if (bestScore >= 0.65) competencyLevel = 'Proficient';
  else if (bestScore >= 0.45) competencyLevel = 'Developing';
  else competencyLevel = 'Foundational';

  const waAttributes = {};
  for (const po of ['PO1', 'PO2', 'PO3', 'PO4', 'PO5', 'PO8']) {
    waAttributes[po] = getAttributeScore(po, concepts, answeredQuestions);
  }

  const skillAttributes = {
    problemSolving: computeSkillFromConcepts(concepts, 'Problem Solving', answeredQuestions),
    design: computeSkillFromConcepts(concepts, 'Design', answeredQuestions),
    analysis: computeSkillFromConcepts(concepts, 'Analysis', answeredQuestions),
    communication: computeSkillFromConcepts(concepts, 'Communication', answeredQuestions),
  };

  const conceptProfile = {};
  for (const domain of allDomains) {
    conceptProfile[domain] = {};
    for (const [name, data] of Object.entries(concepts)) {
      if (data.domain === domain) {
        let status = 'Developing';
        if (data.belief >= 0.7) status = 'Strong';
        else if (data.belief < 0.4) status = 'Weak';
        conceptProfile[domain][name] = { belief: data.belief, status };
      }
    }
  }

  const skillGaps = Object.entries(concepts)
    .filter(([, data]) => data.belief < 0.4)
    .map(([name]) => name);

  const topRoles = suggestRoles(bestDomain, skillAttributes, personalityVector);

  return {
    bestDomain,
    competencyLevel,
    topRoles,
    domainScores,
    conceptProfile,
    personalityVector,
    waAttributes,
    skillAttributes,
    skillGaps,
    remedialPath: session.remedialTriggered || false,
  };
}

function computeSkillFromConcepts(concepts, skillAttribute, answeredQuestions) {
  const relevant = answeredQuestions.filter(q => q.skillAttribute === skillAttribute);
  if (relevant.length === 0) return 0.5;
  const beliefs = relevant
    .map(q => concepts[q.concept]?.belief)
    .filter(b => b !== undefined);
  if (beliefs.length === 0) return 0.5;
  return beliefs.reduce((sum, b) => sum + b, 0) / beliefs.length;
}

function suggestRoles(bestDomain, skillAttributes, personalityVector) {
  const roles = [];

  if (bestDomain === 'DSA') {
    if (skillAttributes.problemSolving >= 0.7) roles.push('Software Development Engineer');
    if (skillAttributes.analysis >= 0.7) roles.push('Backend Engineer');
    if ((personalityVector.analytical || 0) >= 0.7) roles.push('Systems Programmer');
    if (roles.length === 0) roles.push('Software Development Engineer');
  }

  if (bestDomain === 'WebDev') {
    if ((personalityVector.creativity || 0) >= 0.6) roles.push('Frontend Engineer');
    if (skillAttributes.design >= 0.65) roles.push('UI/UX Engineer');
    roles.push('Full Stack Developer');
  }

  if (bestDomain === 'ML') {
    if (skillAttributes.analysis >= 0.7) roles.push('ML Engineer');
    if (skillAttributes.problemSolving >= 0.7) roles.push('Data Scientist');
    roles.push('AI/ML Researcher');
  }

  if (bestDomain === 'Systems') {
    roles.push('Systems Engineer');
    if ((personalityVector.practical || 0) >= 0.7) roles.push('DevOps Engineer');
    if (skillAttributes.design >= 0.65) roles.push('Cloud Infrastructure Engineer');
    if (roles.length < 2) roles.push('DevOps Engineer');
  }

  return [...new Set(roles)].slice(0, 3);
}
```

---

---
## PROMPT 3 — Auth & Dashboard Pages
---

Implement the following pages. Use clean, modern UI. No CSS frameworks — use Tailwind utility classes only (include Tailwind via CDN or install it).

---

### Landing Page (`/`)

Implement per `01_uiux_flow.md` Section 1:
- App name "CareerCompass" + tagline "Find your engineering path"
- "Get Started" button → navigates to `/auth`
- 3-point explainer: (1) Take a personality quiz, (2) Complete an adaptive technical assessment, (3) Get your personalized career roadmap

---

### Auth Page (`/auth`)

Implement per `01_uiux_flow.md` Section 2:
- Toggle between Login and Sign Up
- Sign Up fields: Name, Email, Password, Branch (text input), Year of Study (1–4 dropdown)
- Login fields: Email, Password
- "Continue with Google" button using Firebase `signInWithPopup`
- On successful auth → redirect to `/dashboard`
- On error → show inline error message

Firebase operations (from `02_api_contract.md`):
- Sign Up: `createUserWithEmailAndPassword` then write `users/{uid}` document
- Login: `signInWithEmailAndPassword`
- Google: `signInWithPopup` then upsert `users/{uid}` document

---

### Dashboard Page (`/dashboard`)

Implement per `01_uiux_flow.md` Section 3. Three states based on `users/{uid}.assessmentStatus`:

**State A — `not_started`:**
- Welcome message with student name
- "Start Assessment" button → navigates to `/personality`
- Short description of the two stages

**State B — `in_progress`:**
- Progress indicator showing current phase
- Phase label (e.g., "You are in Phase 3: Domain Expansion")
- "Resume Assessment" button → navigates back to the correct page:
  - If `personalityComplete === false` → `/personality`
  - If `personalityComplete === true && quizComplete === false` → `/quiz`

**State C — `complete` or `remedial`:**
- Summary card: Best domain, top role match (read from `results/{uid}`)
- "View Full Results" button → `/results`
- "Retake Assessment" button → runs the reset logic from `02_api_contract.md` Assessment Reset section

Firestore read on mount: `getDoc(doc(db, 'users', uid))`

---

---
## PROMPT 4 — Personality Assessment Page
---

Implement the Personality Assessment page (`/personality`) fully.

### Behaviour (from `01_uiux_flow.md` Section 4)
- Show one question at a time
- Progress bar: "Question X of N" where N = total personality questions
- Likert scale answer options: 1=Strongly Disagree, 2=Disagree, 3=Neutral, 4=Agree, 5=Strongly Agree
- "Next" button disabled until an option is selected
- No back button — answers are final
- Save each answer to Firestore immediately on Next click
- After last question: compute personality vector in browser, save to Firestore, then navigate to `/quiz/intro`

### Data source
Questions come from the local import — NOT Firestore:
```js
import { personalityQuestions } from '../data/personalityQuestions';
```
Sort questions by `order` field before displaying.

### On mount — resume support
```js
const snap = await getDoc(doc(db, 'personality_responses', uid));
if (snap.exists()) {
  // resume from where they left off
  const answered = snap.data().responses || [];
  startFromIndex = answered.length;
} else {
  // first time — create the document
  await setDoc(doc(db, 'personality_responses', uid), { uid, responses: [] });
  startFromIndex = 0;
}
```

### Saving each answer (from `02_api_contract.md`)
```js
await updateDoc(doc(db, 'personality_responses', uid), {
  responses: arrayUnion({ questionId, response, answeredAt: new Date().toISOString() }),
});
```

### After last question
```js
import { computePersonalityVector } from '../engine/personality';
import { personalityQuestions } from '../data/personalityQuestions';

const { personalityVector, domainPriors } = computePersonalityVector(allResponses, personalityQuestions);

await updateDoc(doc(db, 'personality_responses', uid), {
  personalityVector, domainPriors, completedAt: new Date().toISOString(),
});
await updateDoc(doc(db, 'users', uid), {
  personalityComplete: true, assessmentStatus: 'in_progress',
});

navigate('/quiz/intro');
```

---

### Quiz Intro Page (`/quiz/intro`)

Simple transition screen:
- "Personality assessment complete!" message
- Brief explanation: "You'll now take an adaptive technical quiz. Questions adapt to your responses. ~20–40 questions depending on your performance."
- "Begin Quiz" button → navigate to `/quiz`

---

---
## PROMPT 5 — Quiz Page (Adaptive Engine)
---

Implement the Quiz page (`/quiz`). This is the most complex page. All 8 phases run on this single page.

### Imports

```js
import { questionBank } from '../data/questionBank';
import { updateBelief, getDomainScore, P_INIT } from '../engine/bkt';
import { scoreSubjective, scoreStructured } from '../engine/rubric';
import { selectNextQuestion, checkPhaseTransition, isPhaseComplete } from '../engine/questionSelector';
```

### On mount — load state from Firestore

```js
// 1. Load quiz session (or create if first time)
let session = await getDoc(doc(db, 'quiz_sessions', uid)).then(s => s.data());
if (!session) {
  session = {
    uid, phase: 1,
    activeDomains: ['DSA', 'WebDev', 'ML', 'Systems'],
    eliminatedDomains: [], bestDomain: null,
    questionsAnswered: [],
    domainScores: { DSA: 0, WebDev: 0, ML: 0, Systems: 0 },
    remedialTriggered: false,
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    completedAt: null,
  };
  await setDoc(doc(db, 'quiz_sessions', uid), session);
  await setDoc(doc(db, 'bkt_beliefs', uid), {
    uid, concepts: {},
    domainBeliefs: { DSA: 0, WebDev: 0, ML: 0, Systems: 0 },
    attributeBeliefs: { PO1: 0.5, PO2: 0.5, PO3: 0.5, PO4: 0.5, PO5: 0.5, PO8: 0.5 },
  });
}

// 2. Load BKT beliefs
const bktBeliefs = await getDoc(doc(db, 'bkt_beliefs', uid)).then(s => s.data());

// 3. Load domain priors from personality
const personalityData = await getDoc(doc(db, 'personality_responses', uid)).then(s => s.data());
const domainPriors = personalityData?.domainPriors ?? { DSA: 0.4, WebDev: 0.4, ML: 0.4, Systems: 0.4 };

// 4. Select first question
const currentQuestion = selectNextQuestion({ questionBank, session, bktBeliefs, domainPriors });
```

### On answer submit

```js
async function handleSubmit(userAnswer) {
  // 1. Evaluate
  let evaluation;
  if (currentQuestion.type === 'MCQ') {
    const isCorrect = userAnswer === currentQuestion.correctIndex;
    evaluation = {
      score: isCorrect ? 1.0 : 0.0, isCorrect,
      conceptsMatched: isCorrect ? [currentQuestion.concept] : [],
      conceptsMissed: isCorrect ? [] : [currentQuestion.concept],
    };
  } else if (currentQuestion.type === 'Subjective') {
    evaluation = scoreSubjective(userAnswer, currentQuestion.rubric);
  } else {
    evaluation = scoreStructured(userAnswer, currentQuestion.rubric);
  }

  // 2. BKT update
  const prevBelief = bktBeliefs.concepts[currentQuestion.concept]?.belief ?? P_INIT;
  const updatedBelief = updateBelief(prevBelief, evaluation.isCorrect);

  // 3. Update local state
  bktBeliefs.concepts[currentQuestion.concept] = {
    domain: currentQuestion.domain,
    belief: updatedBelief,
    questionsAsked: (bktBeliefs.concepts[currentQuestion.concept]?.questionsAsked ?? 0) + 1,
    lastUpdated: new Date().toISOString(),
  };
  session.questionsAnswered.push(currentQuestion.questionId);

  // 4. Firestore writes (all three in parallel)
  await Promise.all([
    setDoc(doc(db, 'quiz_responses', uid, 'answers', currentQuestion.questionId), {
      questionId: currentQuestion.questionId,
      domain: currentQuestion.domain,
      concept: currentQuestion.concept,
      bloomLevel: currentQuestion.bloomLevel,
      type: currentQuestion.type,
      phase: session.phase,
      answerIndex: currentQuestion.type === 'MCQ' ? userAnswer : null,
      answerText: currentQuestion.type === 'Subjective' ? userAnswer : null,
      answerStructured: currentQuestion.type === 'SubjectiveStructured' ? userAnswer : null,
      isCorrect: evaluation.isCorrect,
      evaluationScore: evaluation.score,
      conceptsMatched: evaluation.conceptsMatched,
      conceptsMissed: evaluation.conceptsMissed,
      answeredAt: new Date().toISOString(),
      skillAttribute: currentQuestion.skillAttribute,
      waAttributes: currentQuestion.waAttributes,
    }),
    updateDoc(doc(db, 'bkt_beliefs', uid), {
      [`concepts.${currentQuestion.concept}`]: bktBeliefs.concepts[currentQuestion.concept],
    }),
    updateDoc(doc(db, 'quiz_sessions', uid), {
      questionsAnswered: arrayUnion(currentQuestion.questionId),
      lastUpdatedAt: new Date().toISOString(),
    }),
  ]);

  // 5. Check phase completion
  if (isPhaseComplete(session.phase, session.activeDomains, bktBeliefs, questionBank, session.questionsAnswered)) {
    const transition = checkPhaseTransition(session.phase, session.activeDomains, bktBeliefs, domainPriors);

    if (transition.remedial) {
      await updateDoc(doc(db, 'quiz_sessions', uid), { remedialTriggered: true, completedAt: new Date().toISOString() });
      await updateDoc(doc(db, 'users', uid), { assessmentStatus: 'remedial', quizComplete: true });
      navigate('/results');
      return;
    }

    if (transition.newPhase === 8) {
      // Generate and save results
      const answersSnap = await getDocs(collection(db, 'quiz_responses', uid, 'answers'));
      const answeredQuestions = answersSnap.docs.map(d => d.data());
      const results = generateResults({ bktBeliefs, personalityData, session, questionBank, answeredQuestions });
      await setDoc(doc(db, 'results', uid), { ...results, generatedAt: new Date().toISOString() });
      await updateDoc(doc(db, 'users', uid), { assessmentStatus: 'complete', quizComplete: true });
      navigate('/results');
      return;
    }

    // Advance phase
    session.phase = transition.newPhase;
    session.activeDomains = transition.newActiveDomains;
    session.eliminatedDomains = ['DSA','WebDev','ML','Systems'].filter(d => !transition.newActiveDomains.includes(d));
    await updateDoc(doc(db, 'quiz_sessions', uid), {
      phase: session.phase,
      activeDomains: session.activeDomains,
      eliminatedDomains: session.eliminatedDomains,
      lastUpdatedAt: new Date().toISOString(),
    });
    await updateDoc(doc(db, 'users', uid), { currentPhase: session.phase });

    // Show transition card for 2 seconds, then load next question
    showTransitionCard(session.phase, session.activeDomains);
    return;
  }

  // 6. Load next question
  const next = selectNextQuestion({ questionBank, session, bktBeliefs, domainPriors });
  if (!next) {
    // No more questions available — force phase transition
    // (same transition logic as above)
  }
  setCurrentQuestion(next);
  setUserAnswer(null);
}
```

### UI layout (from `01_uiux_flow.md` Section 6)
- Top bar: Phase label + question counter
- Progress bar (approximate)
- Domain tag + Concept tag + Bloom level tag on each question
- For MCQ: 4 option cards, Submit button (disabled until selection)
- For Subjective: textarea with word count indicator, Submit button
- For SubjectiveStructured: 4 labelled textareas (Problem Understanding, Approach, Trade-offs, Decision), Submit button disabled until all 4 have content
- Between phases: transition card (2 second auto-advance) showing new phase name
- Remedial state: gentle message + "View Recommendations" button → `/results`

---

---
## PROMPT 6 — Results Page
---

Implement the Results page (`/results`) fully.

### Data loading on mount
```js
const results = await getDoc(doc(db, 'results', uid)).then(s => s.data());
if (!results) { navigate('/dashboard'); return; }
```

### Render all sections from `01_uiux_flow.md` Section 7 in order:

**A. Top Match Card**
- Best domain (large, prominent badge)
- Competency level (Foundational / Developing / Proficient / Advanced)
- Top role suggestion

**B. Domain Fit Bar Chart**
- Horizontal bars for all 4 domains using `results.domainScores`
- Use recharts `BarChart` (horizontal)
- Color: green if score ≥ 0.65, yellow if ≥ 0.45, red if < 0.45

**C. Personality Radar Chart**
- 5 traits: analytical, creativity, practical, teamOriented, riskTaking
- Use recharts `RadarChart`
- Note below: "These are soft signals that complement your quiz performance"

**D. Concept Breakdown**
- Expandable section per domain
- Each concept listed as Strong (belief ≥ 0.7) / Developing / Weak (belief < 0.4)
- Color coded badges

**E. Washington Accord Attributes**
- Bar chart for PO1, PO2, PO3, PO4, PO5, PO8
- Use recharts `BarChart`

**F. Skill Attribute Scores**
- 4 percentage bars: Problem Solving, Design, Analysis, Communication
- Show as progress bars (not recharts — use plain CSS/Tailwind)

**G. Role Recommendation Cards**
- 2–3 role cards from `results.topRoles`
- Each card: role name + 1 sentence description

**H. Skill Gaps**
- List of weak concepts from `results.skillGaps`
- "Focus areas for improvement" heading

**I. Remedial Path** (only if `results.remedialPath === true`)
- Closest-fit domain
- Encouragement message
- Foundational topics to study

**Actions:**
- "Download Report" button — placeholder only, onClick shows toast "Coming soon"
- "Retake Assessment" button — runs reset logic from `02_api_contract.md`, then navigate to `/dashboard`

---

---
## PROMPT 7 — Polish, Error Handling & Final Wiring
---

Complete the application with the following finishing tasks.

### 1. Protected route wrapper
Create `src/components/ProtectedRoute.jsx`:
- Uses `onAuthStateChanged` to check auth state
- Shows loading spinner while checking
- Redirects to `/auth` if not authenticated
- Wraps all routes except `/` and `/auth`

### 2. Global error handling
Wrap all Firestore calls in try/catch throughout every page.
Implement a toast notification system (simple, no external library needed):
- Firestore write failure → "Something went wrong. Your progress is saved. Please try again."
- Session expired → "Your session expired, please log in again." → redirect to `/auth`

### 3. Navbar
Create `src/components/Navbar.jsx`:
- Show on: `/dashboard`, `/results` only
- Hide on: `/`, `/auth`, `/personality`, `/quiz/intro`, `/quiz`
- Left: App name/logo
- Right: Student name + Logout button
- Logout: calls `signOut(auth)` then redirects to `/`

### 4. Disable Submit after first submission
On both Personality and Quiz pages:
- Disable the Submit/Next button immediately after first click
- Prevent double submission

### 5. Loading states
Show a spinner/skeleton on:
- Dashboard: while loading `users/{uid}`
- Quiz: while loading session + bkt_beliefs on mount
- Results: while loading `results/{uid}`

### 6. Mobile responsiveness
Ensure all pages work on mobile viewport (375px wide minimum).
All charts on Results page must have `width="100%"` with `ResponsiveContainer` from recharts.

### 7. Firestore security rules
Ensure `firebase.json` references the correct Firestore rules file.
The rules should match exactly what is in `03_database_schema.md` — user-owned collections only,
no rules for questions or personality_questions collections.

### 8. Final checks
- Verify `src/data/questionBank.js` exports a single merged array from all 4 domain JSON files
- Verify `src/data/personalityQuestions.js` exports the personality questions array
- Verify no component imports from `firebase/firestore` to fetch questions
- Verify all engine files in `/src/engine/` have zero React imports
- Verify App.jsx wraps protected routes with ProtectedRoute component
- Confirm `load_questions.js` does not exist anywhere in the project
