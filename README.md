# Engineering Career Assessment System
## Master Reference Document

---

## What This System Is

An adaptive, web-based career assessment tool for engineering students.
It combines a personality quiz (Stage 1) with an adaptive technical quiz engine (Stage 2)
to recommend the best-fit engineering domain and career roles for each student.

Full architecture details: see `v1_description.md`

---

## Document Index

| File | Purpose |
|---|---|
| `v1_description.md` | Full system architecture and logic |
| `01_uiux_flow.md` | Every screen, page, and user flow |
| `02_api_contract.md` | Firestore read/write operations + in-browser logic patterns |
| `03_database_schema.md` | Full Firebase Firestore schema |
| `04_bkt_rubric_logic.md` | BKT engine + rubric NLP scorer pseudocode |
| `questionnaire/personality_questions.json` | Example personality questions |
| `questionnaire/quiz/dsa_questions.json` | Example DSA quiz questions |
| `.env.example` | Environment variables template |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) |
| Backend | **None — all logic runs in the browser** |
| Database | Firebase Firestore (accessed directly from frontend via SDK) |
| Auth | Firebase Authentication (Email/Password + Google) |
| Hosting | Firebase Hosting |
| Question Storage | Local JSON files → loaded into Firestore once at setup |

---

## Cost Model

This project runs entirely on Firebase's **Spark (free) plan**. There are no Cloud Functions.

| Service | Free tier | This project's usage |
|---|---|---|
| Firestore reads | 50,000/day | ~3–5 per session |
| Firestore writes | 20,000/day | ~80–110 per user per assessment |
| Firebase Auth | Unlimited | Used for login/signup |
| Firebase Hosting | 10 GB/month | Static React bundle |
| Cloud Functions | **Not used** | $0 |

For a student assessment tool, the free tier is sufficient for hundreds of daily active users.

---

## Architecture Note: No Backend

All logic that would normally live in a server runs in the browser:

| Logic | Where it runs |
|---|---|
| BKT belief update | React (client-side JS) |
| Rubric NLP scorer | React (client-side JS) |
| Adaptive question selection | React (client-side JS) |
| Phase transition controller | React (client-side JS) |
| Personality vector computation | React (client-side JS) |
| Result generation | React (client-side JS) |
| Data persistence | Firestore SDK (called directly from React) |

This means the answer keys and rubrics are included in the question documents fetched from Firestore.
For a career assessment tool this is acceptable. If exam-grade security is needed later,
rubric answer keys can be moved to a restricted Firestore collection with server-only access rules.

---

## Project Folder Structure

```
/
├── src/                        # React frontend
│   ├── pages/
│   │   ├── Landing.jsx
│   │   ├── Auth.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Personality.jsx
│   │   ├── QuizIntro.jsx
│   │   ├── Quiz.jsx
│   │   └── Results.jsx
│   ├── components/             # Reusable UI components
│   ├── engine/                 # Core logic (pure JS, no React deps)
│   │   ├── bkt.js              # BKT updateBelief(), getDomainScore()
│   │   ├── rubric.js           # scoreSubjective(), scoreStructured()
│   │   ├── questionSelector.js # selectNextQuestion(), phase transitions
│   │   ├── personality.js      # computePersonalityVector(), mapToDomainPriors()
│   │   └── resultGenerator.js  # generateResults(), suggestRoles()
│   ├── firebase.js             # Firebase init using .env values
│   └── App.jsx
│
├── questionnaire/              # Question bank JSON files
│   ├── personality_questions.json
│   └── quiz/
│       ├── dsa_questions.json
│       ├── webdev_questions.json
│       ├── ml_questions.json
│       └── systems_questions.json
│
├── scripts/
│   └── load_questions.js       # One-time script: loads JSON → Firestore
│
├── .env                        # Your actual keys (never commit this)
├── .env.example                # Template (safe to share)
└── firebase.json               # Firebase project config (Hosting only)
```

---

## Setup Instructions

### Step 1 — Firebase Project Setup
1. Go to https://console.firebase.google.com
2. Create a new project
3. Enable:
   - **Authentication** (Email/Password + Google sign-in)
   - **Firestore Database** (start in test mode, then apply security rules below)
   - **Hosting**
4. Copy credentials into `.env` (follow `.env.example`)
5. **Do NOT enable Cloud Functions** — they are not used and are not free beyond the free tier

### Step 2 — Install Dependencies
```bash
npm install
```

### Step 3 — Apply Firestore Security Rules
In the Firebase Console → Firestore → Rules, paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Questions and personality questions: any logged-in user can read, nobody can write from frontend
    match /questions/{questionId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    match /personality_questions/{questionId} {
      allow read: if request.auth != null;
      allow write: if false;
    }

    // User-owned collections: user can only read/write their own documents
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /personality_responses/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /quiz_sessions/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /quiz_responses/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /quiz_responses/{uid}/answers/{answerId} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /bkt_beliefs/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /results/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

### Step 4 — Load Questions into Firestore
```bash
node scripts/load_questions.js
```
This reads all JSON files from `/questionnaire/` and batch-writes them to Firestore.
Run this **once** before the first deployment (and again if you update questions).

### Step 5 — Run Locally
```bash
npm run dev                   # starts React frontend on localhost
firebase emulators:start      # optional: run Firestore locally for testing
```

### Step 6 — Deploy
```bash
npm run build
firebase deploy --only hosting
```

---

## Instructions for Antigravity (or any AI builder)

Build a full-stack web application using the documents in this folder.
Do not make assumptions — every decision is already specified.

References:
- Screens and navigation: `01_uiux_flow.md`
- Firestore read/write patterns: `02_api_contract.md`
- Database structure: `03_database_schema.md`
- Core engine logic: `04_bkt_rubric_logic.md`
- System architecture: `v1_description.md`

Key rules:
1. Use Firebase (Firestore, Auth, Hosting) — no other backend
2. **Do NOT use Firebase Cloud Functions** — they are not free and not needed
3. All logic (BKT, rubric scoring, question selection, result generation) runs in the React frontend
4. Questions come from JSON files loaded into Firestore — there is no admin panel
5. All quiz state is saved to Firestore after every answer (resume support)
6. Students cannot go back to previous questions
7. The personality vector influences domain priors as soft weights only — it never blocks a domain
8. Put all engine logic in `/src/engine/` as pure JS modules (no React dependencies inside them)

---

## What You (the owner) Need to Do

1. Create a Firebase project at https://console.firebase.google.com (free Spark plan)
2. Follow `.env.example` to fill in your Firebase credentials
3. Add your actual quiz questions to the JSON files in `/questionnaire/quiz/`
4. Add your actual personality questions to `/questionnaire/personality_questions.json`
5. Apply the Firestore security rules from Step 3 above
6. Run the question loader script once
7. Hand all these docs to Antigravity with the instruction above

You do not need to write any code yourself. You do not need to pay for anything.
