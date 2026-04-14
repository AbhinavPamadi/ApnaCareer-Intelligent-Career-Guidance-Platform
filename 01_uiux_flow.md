# UI/UX Flow Document
## Engineering Career Assessment System

---

## General Rules

- Web only (desktop-first, mobile responsive)
- Users: Engineering students only
- No admin panel — questions come from JSON files loaded into Firebase
- All pages require login except Landing page
- Progress is always saved to Firebase so a user can resume if they close the browser

---

## Pages & Screens

---

### 1. Landing Page (`/`)

**Purpose:** Entry point. Student lands here, logs in or signs up.

**Elements:**
- App name + tagline
- "Get Started" button → goes to `/auth`
- Brief 3-point explainer of what the system does

---

### 2. Auth Page (`/auth`)

**Purpose:** Login / Sign up

**Elements:**
- Toggle: Login | Sign Up
- Sign Up fields: Name, Email, Password, Branch, Year of Study
- Login fields: Email, Password
- "Continue with Google" button (Firebase Auth)
- On success → redirect to `/dashboard`

---

### 3. Dashboard (`/dashboard`)

**Purpose:** Student home. Shows status of their assessment.

**States:**

**State A — Not started:**
- Welcome message with student name
- "Start Assessment" button → goes to `/personality`
- Short description of what happens (2 stages, takes ~30–40 mins)

**State B — In progress:**
- Progress indicator showing which phase they're in
- "Resume Assessment" button → takes them back to where they left off
- Phase label (e.g., "You are in Phase 3: Domain Expansion")

**State C — Completed:**
- Summary card: Best domain, top role match
- "View Full Results" button → goes to `/results`
- Option to retake (resets all data for that user)

---

### 4. Personality Assessment (`/personality`)

**Purpose:** Stage 1 — RIASEC-inspired questionnaire

**Elements:**
- Progress bar (Question X of 20)
- One question at a time displayed
- Answer options (Likert scale: Strongly Agree → Strongly Disagree, or MCQ depending on question type)
- "Next" button (disabled until option selected)
- No back button — answers are final once submitted
- On last question → auto-proceeds to `/quiz/intro`

**Data saved after each answer:** response stored in Firebase immediately

---

### 5. Quiz Intro Page (`/quiz/intro`)

**Purpose:** Transition screen between Stage 1 and Stage 2

**Elements:**
- "Personality assessment complete!" confirmation
- Brief explanation of what happens next (adaptive quiz, ~20–40 questions depending on performance)
- "Begin Quiz" button → goes to `/quiz`

---

### 6. Quiz Page (`/quiz`)

**Purpose:** Stage 2 — Adaptive quiz engine. All 8 phases happen on this single page, driven by backend logic.

**Layout:**
- Top: Phase label (e.g., "Phase 1: Domain Screening") + question counter
- Progress bar (approximate — adapts as questions change)
- Domain tag shown on each question (e.g., "DSA", "ML")
- Concept tag shown (e.g., "Binary Search")
- Bloom's level shown subtly (e.g., "Apply")
- Question text (large, readable)

**For MCQ questions:**
- 4 options displayed as selectable cards
- "Submit Answer" button (disabled until selection)
- No back button

**For Subjective questions (non-L6):**
- Text area for free response
- Word count indicator (min 30 words suggested)
- "Submit Answer" button

**For L6 Structured Template questions:**
- 4 clearly labelled text boxes:
  1. Problem Understanding
  2. Approach
  3. Trade-offs
  4. Decision
- Each box has a placeholder hint
- "Submit Answer" button (disabled until all 4 fields have content)

**Between phases:**
- Brief transition card shown (e.g., "Moving to deeper questions in your top 3 domains…")
- Auto-advances after 2 seconds

**Minimum Threshold Fail State:**
- If triggered after Phase 1 → show a gentle message:
  "Based on your responses, we recommend building foundational skills first."
- Show remedial recommendations
- Button: "View Recommendations" → goes to `/results`

**On quiz completion:**
- Auto-redirect to `/results`

---

### 7. Results Page (`/results`)

**Purpose:** Full output dashboard

**Sections (displayed top to bottom):**

**A. Top Match Card**
- Best domain (large, prominent)
- Top role suggestion
- Overall competency level (Foundational / Developing / Proficient / Advanced)

**B. Domain Fit**
- Horizontal bar chart showing all 4 domains ranked by confidence score
- Colour-coded (green = strong, yellow = moderate, red = weak)

**C. Personality Insights**
- Radar/spider chart of the 5 personality traits
- Small note: "These are soft signals that complement your quiz performance"

**D. Skill Insights**
- Per-domain concept breakdown
- Each concept shown as: Strong / Developing / Weak
- Expandable sections per domain

**E. Washington Accord Attribute Breakdown**
- Bar chart of PO1, PO2, PO3, PO4, PO5, PO8 scores

**F. Skill Attribute Scores**
- 4 scores: Problem Solving, Design, Analysis, Communication
- Shown as percentage bars

**G. Recommendations**
- Role cards (2–3 best-fit roles with short descriptions)
- Skill gap list: specific weak concepts to work on
- "Next Steps" section with generic learning resource suggestions per domain

**H. Remedial Path (only shown if threshold failed)**
- Closest-fit domain
- Foundational topics to study
- Encouragement message

**Actions:**
- "Download Report" button (generates a simple PDF summary — future feature, placeholder for now)
- "Retake Assessment" button

---

## Navigation Rules

- Navbar is minimal: App logo (left) + Student name + Logout (right)
- No sidebar
- Students cannot jump between quiz phases manually
- Assessment pages (`/personality`, `/quiz`) hide the navbar to reduce distraction

---

## Error & Edge Case Screens

- **Session expired:** Show "Your session expired, please log in again" → redirect to `/auth`
- **Firebase error:** Show "Something went wrong, your progress is saved. Please try again."
- **Incomplete submission:** "Please answer the question before continuing."

---

## Screen Flow Summary

```
/ (Landing)
  ↓
/auth (Login/Signup)
  ↓
/dashboard
  ↓ [Start Assessment]
/personality (Stage 1 — 20 questions)
  ↓
/quiz/intro
  ↓
/quiz (Stage 2 — adaptive, all phases)
  ↓
/results (Full dashboard)
```
