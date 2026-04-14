# Firebase Database Schema
## Engineering Career Assessment System

---

## Database: Firebase Firestore

All data lives in Firestore (NoSQL, document-based).
Questions are loaded from local JSON files into Firestore once during setup.

---

## Collections

---

### Collection: `users`

One document per registered student.

**Document ID:** Firebase Auth UID (auto-assigned on signup)

```json
{
  "uid": "abc123xyz",
  "name": "Rohan Sharma",
  "email": "rohan@example.com",
  "branch": "Computer Science",
  "yearOfStudy": 2,
  "createdAt": "2024-01-15T10:00:00Z",
  "assessmentStatus": "in_progress",
  "personalityComplete": true,
  "quizComplete": false,
  "currentPhase": 3,
  "questionsAnsweredCount": 14
}
```

**Field notes:**
- `assessmentStatus`: `"not_started"` | `"in_progress"` | `"complete"` | `"remedial"`
- `currentPhase`: 1–8 (which quiz phase they're on)

---

### Collection: `personality_responses`

One document per user storing all personality answers.

**Document ID:** same as Firebase Auth UID

```json
{
  "uid": "abc123xyz",
  "responses": [
    { "questionId": "p_001", "response": 4, "answeredAt": "2024-01-15T10:05:00Z" },
    { "questionId": "p_002", "response": 2, "answeredAt": "2024-01-15T10:05:30Z" }
  ],
  "personalityVector": {
    "analytical": 0.85,
    "creativity": 0.5,
    "practical": 0.75,
    "teamOriented": 0.4,
    "riskTaking": 0.6
  },
  "domainPriors": {
    "DSA": 0.7,
    "WebDev": 0.4,
    "ML": 0.55,
    "Systems": 0.65
  },
  "completedAt": "2024-01-15T10:20:00Z"
}
```

---

### Collection: `quiz_sessions`

One document per user tracking their adaptive quiz state.

**Document ID:** same as Firebase Auth UID

```json
{
  "uid": "abc123xyz",
  "phase": 3,
  "activedomains": ["DSA", "ML", "Systems"],
  "eliminatedDomains": ["WebDev"],
  "bestDomain": null,
  "questionsAnswered": [
    "q_dsa_001", "q_dsa_002", "q_ml_005", "q_sys_003"
  ],
  "domainScores": {
    "DSA": 0.74,
    "ML": 0.61,
    "WebDev": 0.38,
    "Systems": 0.55
  },
  "remedialTriggered": false,
  "startedAt": "2024-01-15T10:22:00Z",
  "lastUpdatedAt": "2024-01-15T10:45:00Z",
  "completedAt": null
}
```

---

### Collection: `quiz_responses`

One document per user. Stores all quiz answers as a subcollection.

**Document ID:** same as Firebase Auth UID

**Subcollection: `answers`**

Each answer is one document:

**Document ID:** `questionId`

```json
{
  "questionId": "q_dsa_042",
  "domain": "DSA",
  "concept": "Binary Search",
  "bloomLevel": "Apply",
  "type": "MCQ",
  "phase": 1,
  "answerIndex": 0,
  "answerText": null,
  "answerStructured": null,
  "isCorrect": true,
  "evaluationScore": 1.0,
  "conceptsMatched": ["binary search", "logarithmic"],
  "conceptsMissed": [],
  "answeredAt": "2024-01-15T10:25:00Z"
}
```

For subjective answers, `answerText` contains the response string.
For L6 structured answers, `answerStructured` contains the 4-field object.

---

### Collection: `bkt_beliefs`

One document per user. Stores concept-level BKT belief states.

**Document ID:** same as Firebase Auth UID

```json
{
  "uid": "abc123xyz",
  "concepts": {
    "BinarySearch": {
      "domain": "DSA",
      "belief": 0.91,
      "questionsAsked": 3,
      "lastUpdated": "2024-01-15T10:30:00Z"
    },
    "GraphTraversal": {
      "domain": "DSA",
      "belief": 0.55,
      "questionsAsked": 2,
      "lastUpdated": "2024-01-15T10:35:00Z"
    },
    "GradientDescent": {
      "domain": "ML",
      "belief": 0.62,
      "questionsAsked": 2,
      "lastUpdated": "2024-01-15T10:40:00Z"
    }
  },
  "domainBeliefs": {
    "DSA": 0.74,
    "ML": 0.61,
    "WebDev": 0.38,
    "Systems": 0.55
  },
  "attributeBeliefs": {
    "PO1": 0.8,
    "PO2": 0.72,
    "PO3": 0.65,
    "PO4": 0.6,
    "PO5": 0.55,
    "PO8": 0.5
  }
}
```

---

### Collection: `results`

One document per user. Written once when quiz is complete.

**Document ID:** same as Firebase Auth UID

```json
{
  "uid": "abc123xyz",
  "bestDomain": "DSA",
  "competencyLevel": "Proficient",
  "topRoles": ["Backend Engineer", "SDE", "Systems Programmer"],
  "domainScores": {
    "DSA": 0.82,
    "Systems": 0.71,
    "ML": 0.58,
    "WebDev": 0.41
  },
  "conceptProfile": {
    "DSA": {
      "BinarySearch": { "belief": 0.91, "status": "Strong" },
      "GraphTraversal": { "belief": 0.55, "status": "Developing" },
      "DynamicProgramming": { "belief": 0.3, "status": "Weak" }
    }
  },
  "personalityVector": {
    "analytical": 0.85,
    "creativity": 0.5,
    "practical": 0.75,
    "teamOriented": 0.4,
    "riskTaking": 0.6
  },
  "waAttributes": {
    "PO1": 0.8,
    "PO2": 0.72,
    "PO3": 0.65,
    "PO4": 0.6,
    "PO5": 0.55,
    "PO8": 0.5
  },
  "skillAttributes": {
    "problemSolving": 0.78,
    "design": 0.62,
    "analysis": 0.7,
    "communication": 0.55
  },
  "skillGaps": ["DynamicProgramming", "PO8", "CSSLayout"],
  "remedialPath": false,
  "generatedAt": "2024-01-15T11:10:00Z"
}
```

---

### Collection: `questions`

Loaded from JSON files during setup. One document per question.

**Document ID:** `questionId` (e.g., `q_dsa_042`)

```json
{
  "questionId": "q_dsa_042",
  "domain": "DSA",
  "concept": "BinarySearch",
  "bloomLevel": "Apply",
  "difficulty": "Medium",
  "waAttributes": ["PO1", "PO2"],
  "skillAttribute": "Problem Solving",
  "type": "MCQ",
  "text": "Given a sorted array of 1000 elements, what is the maximum number of comparisons needed?",
  "options": ["10", "100", "1000", "500"],
  "correctIndex": 0,
  "rubric": null
}
```

For subjective questions, `rubric` is populated:

```json
{
  "rubric": {
    "keyConcepts": ["learning rate", "step size", "convergence", "gradient"],
    "supportingConcepts": ["overshoot", "local minima", "epoch"],
    "logicalConnectors": ["because", "therefore", "however", "trade-off"],
    "minWordCount": 30
  }
}
```

For L6 structured questions:

```json
{
  "type": "SubjectiveStructured",
  "rubric": {
    "problemUnderstanding": {
      "keyConcepts": ["scale", "shortening", "unique mapping"],
      "weight": 0.25
    },
    "approach": {
      "keyConcepts": ["hash", "base62", "database", "redirect"],
      "weight": 0.25
    },
    "tradeoffs": {
      "keyConcepts": ["collision", "storage", "latency", "consistency"],
      "weight": 0.25
    },
    "decision": {
      "keyConcepts": ["recommend", "justify", "reason"],
      "weight": 0.25
    }
  }
}
```

---

### Collection: `personality_questions`

Loaded from JSON file during setup.

**Document ID:** `questionId` (e.g., `p_001`)

```json
{
  "questionId": "p_001",
  "text": "I enjoy breaking down complex problems into smaller parts and solving them systematically.",
  "type": "likert",
  "traitMapped": "analytical",
  "order": 1
}
```

---

## Firestore Security Rules (summary)

- Users can only read/write their own documents (matched by UID)
- `questions` and `personality_questions` collections are read-only for all authenticated users
- No public read access to any collection
- Only Firebase Cloud Functions (backend) can write to `results` and `bkt_beliefs`

---

## Question JSON File Structure (local files → loaded into Firestore)

```
/questionnaire/
  personality_questions.json
  /quiz/
    dsa_questions.json
    webdev_questions.json
    ml_questions.json
    systems_questions.json
```

Each file is an array of question objects matching the Firestore schema above.

Loading script: run once with `node scripts/load_questions.js` — reads all JSON files and batch-writes to Firestore `questions` and `personality_questions` collections.
