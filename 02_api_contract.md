# Data Access Contract Document
## Engineering Career Assessment System

> **v2 — No Backend / No Cloud Functions**
> All logic runs in the React frontend. There are no HTTP API endpoints.
> Data is read and written directly via the Firebase SDK (Firestore + Auth).
> This document replaces the previous `02_api_contract.md` that described Cloud Function endpoints.

---

## General Notes

- Backend: **None**
- All BKT, rubric scoring, adaptive phase logic, and result generation run in the browser (client-side JS)
- Database: Firebase Firestore (accessed directly via `firebase/firestore` SDK)
- Auth: Firebase Authentication (`firebase/auth`)
- Questions are loaded from local JSON files into Firestore once during setup
- All Firestore operations require the user to be signed in (enforced via security rules)

---

## Firebase Initialization

```js
// src/firebase.js
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

---

## Auth Operations

### Sign Up
```js
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const { user } = await createUserWithEmailAndPassword(auth, email, password);

// Write user profile to Firestore
await setDoc(doc(db, 'users', user.uid), {
  uid: user.uid,
  name,
  email,
  branch,
  yearOfStudy,
  createdAt: new Date().toISOString(),
  assessmentStatus: 'not_started',
  personalityComplete: false,
  quizComplete: false,
  currentPhase: 1,
  questionsAnsweredCount: 0,
});
```

### Login
```js
import { signInWithEmailAndPassword } from 'firebase/auth';
const { user } = await signInWithEmailAndPassword(auth, email, password);
```

### Google Login
```js
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
const provider = new GoogleAuthProvider();
const { user } = await signInWithPopup(auth, provider);
// then upsert users/{uid} document same as sign up
```

### Logout
```js
import { signOut } from 'firebase/auth';
await signOut(auth);
```

---

## Personality Assessment Operations

### Submit one personality answer
Called after each question. Saves to Firestore immediately (supports resume).

```js
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

// Append answer to personality_responses/{uid}.responses array
await updateDoc(doc(db, 'personality_responses', uid), {
  responses: arrayUnion({
    questionId,
    response,           // number 1–5 (Likert)
    answeredAt: new Date().toISOString(),
  }),
});
```

### Compute and save personality vector (called after all 20 questions answered)
This runs entirely in the browser using the scoring logic below, then writes the result.

```js
// Scoring runs in-browser (see personality scoring logic section)
const { personalityVector, domainPriors } = computePersonalityVector(responses);

await updateDoc(doc(db, 'personality_responses', uid), {
  personalityVector,
  domainPriors,
  completedAt: new Date().toISOString(),
});

await updateDoc(doc(db, 'users', uid), {
  personalityComplete: true,
  assessmentStatus: 'in_progress',
});
```

### Get personality status (for resume / dashboard)
```js
import { doc, getDoc } from 'firebase/firestore';

const snap = await getDoc(doc(db, 'personality_responses', uid));
const data = snap.exists() ? snap.data() : null;
// data.personalityVector, data.domainPriors, data.completedAt
```

---

## Personality Scoring Logic (runs in browser)

```js
// Each response is 1–5 (Likert). Reversed questions are flipped first.
function computePersonalityVector(responses, questions) {
  const traitSums = {};
  const traitCounts = {};

  for (const r of responses) {
    const q = questions.find(q => q.questionId === r.questionId);
    const value = q.reversed ? (6 - r.response) : r.response;
    const norm = (value - 1) / 4; // 0.0 to 1.0

    traitSums[q.traitMapped] = (traitSums[q.traitMapped] || 0) + norm;
    traitCounts[q.traitMapped] = (traitCounts[q.traitMapped] || 0) + 1;
  }

  const personalityVector = {};
  for (const trait in traitSums) {
    personalityVector[trait] = traitSums[trait] / traitCounts[trait];
  }

  const domainPriors = mapPersonalityToDomainPriors(personalityVector);
  return { personalityVector, domainPriors };
}

// Soft nudge only — does not block any domain
function mapPersonalityToDomainPriors(pv) {
  return {
    DSA:     0.4 + 0.3 * pv.analytical,
    Systems: 0.4 + 0.2 * pv.practical + 0.1 * pv.analytical,
    ML:      0.4 + 0.2 * pv.analytical + 0.1 * pv.creativity,
    WebDev:  0.4 + 0.2 * pv.creativity + 0.1 * pv.practical,
  };
}
```

---

## Quiz Operations

### Load question bank (once on quiz start)
Questions are fetched from Firestore once and held in memory for the session.

```js
import { collection, getDocs } from 'firebase/firestore';

const snapshot = await getDocs(collection(db, 'questions'));
const questionBank = snapshot.docs.map(d => d.data());
```

### Get quiz state (for resume)
```js
const snap = await getDoc(doc(db, 'quiz_sessions', uid));
const session = snap.exists() ? snap.data() : null;
```

### Initialize quiz session (first time only)
```js
await setDoc(doc(db, 'quiz_sessions', uid), {
  uid,
  phase: 1,
  activeDomains: ['DSA', 'WebDev', 'ML', 'Systems'],
  eliminatedDomains: [],
  bestDomain: null,
  questionsAnswered: [],
  domainScores: { DSA: 0, WebDev: 0, ML: 0, Systems: 0 },
  remedialTriggered: false,
  startedAt: new Date().toISOString(),
  lastUpdatedAt: new Date().toISOString(),
  completedAt: null,
});

// Initialize BKT beliefs document
await setDoc(doc(db, 'bkt_beliefs', uid), {
  uid,
  concepts: {},
  domainBeliefs: { DSA: 0, WebDev: 0, ML: 0, Systems: 0 },
  attributeBeliefs: { PO1: 0.5, PO2: 0.5, PO3: 0.5, PO4: 0.5, PO5: 0.5, PO8: 0.5 },
});
```

### Select next question (runs in browser)
Entire adaptive question selection runs client-side. See `04_bkt_rubric_logic.md` for pseudocode.

```js
// All inputs come from in-memory state (loaded from Firestore at session start / resume)
const nextQuestion = selectNextQuestion({
  questionBank,
  session,      // phase, activeDomains, questionsAnswered
  bktBeliefs,   // concept-level beliefs
  domainPriors, // from personality vector
});
```

### Submit an answer and update BKT (runs in browser, then saves to Firestore)

```js
// 1. Evaluate the answer (in browser)
const evaluation = evaluateAnswer(question, userAnswer);
// Returns: { score, isCorrect, conceptsMatched, conceptsMissed }

// 2. Run BKT update (in browser)
const previousBelief = bktBeliefs.concepts[concept]?.belief ?? P_INIT;
const updatedBelief = updateBelief(previousBelief, evaluation.isCorrect);

// 3. Save answer to Firestore
await setDoc(
  doc(db, 'quiz_responses', uid, 'answers', question.questionId),
  {
    questionId: question.questionId,
    domain: question.domain,
    concept: question.concept,
    bloomLevel: question.bloomLevel,
    type: question.type,
    phase: session.phase,
    answerIndex: question.type === 'MCQ' ? userAnswer : null,
    answerText: question.type === 'Subjective' ? userAnswer : null,
    answerStructured: question.type === 'SubjectiveStructured' ? userAnswer : null,
    isCorrect: evaluation.isCorrect,
    evaluationScore: evaluation.score,
    conceptsMatched: evaluation.conceptsMatched,
    conceptsMissed: evaluation.conceptsMissed,
    answeredAt: new Date().toISOString(),
  }
);

// 4. Save updated BKT belief to Firestore
await updateDoc(doc(db, 'bkt_beliefs', uid), {
  [`concepts.${concept}`]: {
    domain: question.domain,
    belief: updatedBelief,
    questionsAsked: (previousData.questionsAsked ?? 0) + 1,
    lastUpdated: new Date().toISOString(),
  },
});

// 5. Update quiz session (questionsAnswered list, lastUpdatedAt)
await updateDoc(doc(db, 'quiz_sessions', uid), {
  questionsAnswered: arrayUnion(question.questionId),
  lastUpdatedAt: new Date().toISOString(),
});
```

### Update phase in Firestore (when phase transitions happen)
```js
await updateDoc(doc(db, 'quiz_sessions', uid), {
  phase: newPhase,
  activeDomains: newActiveDomains,
  eliminatedDomains: newEliminatedDomains,
  domainScores: recomputedDomainScores,
  lastUpdatedAt: new Date().toISOString(),
});

await updateDoc(doc(db, 'users', uid), {
  currentPhase: newPhase,
});
```

### Trigger remedial path
```js
await updateDoc(doc(db, 'quiz_sessions', uid), {
  remedialTriggered: true,
  completedAt: new Date().toISOString(),
});

await updateDoc(doc(db, 'users', uid), {
  assessmentStatus: 'remedial',
  quizComplete: true,
});
```

---

## Answer Evaluation Logic (runs in browser)

For MCQ:
```js
function evaluateAnswer(question, answerIndex) {
  const isCorrect = answerIndex === question.correctIndex;
  return {
    score: isCorrect ? 1.0 : 0.0,
    isCorrect,
    conceptsMatched: isCorrect ? [question.concept] : [],
    conceptsMissed: isCorrect ? [] : [question.concept],
  };
}
```

For Subjective and SubjectiveStructured: see rubric scoring in `04_bkt_rubric_logic.md`. Output is the same shape as above.

---

## Results Operations

### Write final results (called once when quiz completes, runs in browser)
All data is already in Firestore (bkt_beliefs, quiz_sessions, personality_responses).
The results document is computed client-side and written once.

```js
// Compute in browser from loaded bkt_beliefs + personality_responses
const results = generateResults({ bktBeliefs, personalityData, session });

await setDoc(doc(db, 'results', uid), {
  ...results,
  generatedAt: new Date().toISOString(),
});

await updateDoc(doc(db, 'users', uid), {
  assessmentStatus: 'complete',
  quizComplete: true,
});
```

### Read results (for Results page)
```js
const snap = await getDoc(doc(db, 'results', uid));
const results = snap.data();
```

---

## Assessment Reset

```js
import { deleteDoc, writeBatch } from 'firebase/firestore';

const batch = writeBatch(db);

// Reset user status
batch.update(doc(db, 'users', uid), {
  assessmentStatus: 'not_started',
  personalityComplete: false,
  quizComplete: false,
  currentPhase: 1,
  questionsAnsweredCount: 0,
});

// Delete session and result documents
batch.delete(doc(db, 'personality_responses', uid));
batch.delete(doc(db, 'quiz_sessions', uid));
batch.delete(doc(db, 'bkt_beliefs', uid));
batch.delete(doc(db, 'results', uid));

// Note: quiz_responses subcollection answers must be deleted separately
// (Firestore does not cascade-delete subcollections)

await batch.commit();

// Then delete subcollection answers individually:
const answersSnap = await getDocs(collection(db, 'quiz_responses', uid, 'answers'));
const delBatch = writeBatch(db);
answersSnap.docs.forEach(d => delBatch.delete(d.ref));
await delBatch.commit();
```

---

## Error Handling Pattern

All Firestore operations should be wrapped in try/catch. Display user-friendly messages:

| Scenario | Message shown to user |
|---|---|
| User not authenticated | "Your session expired, please log in again." → redirect to `/auth` |
| Firestore write fails | "Something went wrong. Your progress is saved. Please try again." |
| Results not yet generated | Do not show Results page — redirect to `/dashboard` |
| Question already answered | Block re-submission at the UI level (disable Submit button after first submit) |

---

## Firestore Usage Estimate (Spark / Free Tier)

| Operation | Reads/Writes per user |
|---|---|
| Auth + profile write | 1 write |
| Personality (20 questions) | ~20 writes |
| Quiz (20–40 questions) | ~40–80 writes (answers + BKT updates) |
| Phase transitions | ~4 writes |
| Results generation | 1 write |
| Dashboard reads | ~3–5 reads |
| **Total per user** | **~80–110 reads + writes** |

Free tier: 50,000 reads + 20,000 writes per day.
At ~100 operations per user, the free tier supports ~200 active users per day with comfortable headroom.
