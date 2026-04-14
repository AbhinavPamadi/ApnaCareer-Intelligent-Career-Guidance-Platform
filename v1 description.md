Engineering Career Assessment System
(Personality + Adaptive Quiz Architecture) — v1

Overview
This system evaluates users through a combination of:
Personality Assessment (Stage 1)
Adaptive Quiz Engine (Stage 2)
It dynamically identifies the most suitable engineering domains and roles by combining:
Personality traits
Concept-level performance
Adaptive belief modeling (BKT at concept level)

High-Level Flow
User ↓ Personality Assessment ↓ Adaptive Quiz Engine ↓ Evaluation + BKT Engine ↓ Profiling Engine ↓ Recommendation Engine ↓ Dashboard

1. Personality Assessment Layer (Stage 1)
Input
Questionnaire (RIASEC-inspired + engineering-specific traits)
Trait Extraction Engine
Maps responses into:
Analytical inclination
Creativity
Practical vs Theoretical preference
Team vs Individual preference
Risk-taking vs Structured mindset
Output
Personality Vector
Initial Domain Priors (soft weights used to nudge quiz starting point — not hard redirects)
Important: Personality priors are soft nudges only. They slightly increase the probability of starting in certain domains but do not gate or block any domain from being explored. The quiz performance always takes precedence over personality priors.
Example: Analytical: High Creative: Medium Practical: High


Soft-boost starting weight for: DSA, Systems (other domains remain accessible)



Bloom's Taxonomy Integration
Questions are structured across levels inspired by academic systems like Visvesvaraya Technological University (VTU):
Remember
Understand
Apply
Analyze
Evaluate
Create
This ensures:
Not just correctness
But depth of understanding

Washington Accord Integration
The assessment is aligned with Washington Accord Graduate Attributes (PO1–PO12) to ensure evaluation beyond theoretical knowledge.
The quiz specifically focuses on:
PO1 – Engineering Knowledge
PO2 – Problem Analysis
PO3 – Design / Development of Solutions
PO4 – Investigation of Problems
PO5 – Modern Tool Usage
PO8 – Ethics
Important: Each question is tagged with one or more PO attributes directly. WA attribute profiles are aggregated dynamically from per-question tags — not assigned statically by phase. A single question may map to multiple POs simultaneously.
This ensures:
Not just problem-solving ability


But real-world engineering competency


Not just technical knowledge


But decision-making, design thinking, and professional responsibility



2. Adaptive Quiz Engine (Stage 2 Core)
Works on Bayesian Knowledge Tracing (BKT) at the concept level to dynamically estimate student knowledge and adapt question flow. Domain-level confidence is derived by aggregating concept-level beliefs upward — not tracked independently.
Domain Space
DSA
Web Development
Machine Learning
Systems

Question Bank
Each question is tagged with:
Domain
Concept (specific — e.g., "Binary Search", "CSS Flexbox", "Gradient Descent")
Difficulty (Easy / Medium / Hard)
Bloom's Level
Remember
Understand
Apply
Analyze
Evaluate
Create
Washington Accord Attributes (one or more per question)
PO1 – Engineering Knowledge
PO2 – Problem Analysis
PO3 – Design / Development of Solutions
PO4 – Investigation of Problems
PO5 – Modern Tool Usage
PO8 – Ethics
Skill Attribute
Problem Solving
Design
Analysis
Communication
Type
MCQ
Subjective (structured template — see Phase 7)

Adaptive Workflow Controller
Phase 1: Domain Screening
4 domains × 4–5 questions each
Mixed concepts within each domain
Difficulty: Basic (Bloom L1–L2)
Goal:
Identify foundational knowledge across all domains
Establish initial performance baseline
Minimum Threshold Check (new): After Phase 1, if a user scores below the minimum baseline across all 4 domains, the system does not force a career match. Instead it:
Flags the user as needing foundational skill development
Triggers a Remedial Path output: identifies the closest-fit domain and surfaces a "foundational skills" recommendation with learning resources
Skips further adaptive phases to avoid meaningless ranking

Phase 2: Domain Ranking & Selection
Score each domain by aggregating concept-level BKT beliefs
Rank domains based on aggregated performance
Select top 3 domains
Goal:
Eliminate weaker domains
Focus assessment on stronger areas

Phase 3: Adaptive Domain Expansion
Dynamically adjust number of questions per domain


If performance is strong → increase depth


If performance is weak → reduce or stop


Difficulty: Intermediate (Bloom L3–L4)


Goal:
Explore depth of understanding at concept level
Optimize question count using adaptive logic

Phase 4: Domain Narrowing
Re-evaluate aggregated concept beliefs per domain after expansion
Select top 2 domains
Goal:
Further refine focus areas
Move towards specialization

Phase 5: Advanced Domain Evaluation
Case-based and complex problem-solving questions
Difficulty: High (Bloom L4–L5)
Goal:
Assess analytical and decision-making skills
Evaluate real-world problem-solving ability

Phase 6: Final Domain Selection
Identify the best-performing domain based on concept-level BKT aggregation
Goal:
Determine strongest area of competence

Phase 7: Domain Mastery Assessment
Design-oriented questions using structured response templates
Real-world scenarios
Difficulty: Highest (Bloom L6)
Structured Response Template (mandatory for all L6 subjective questions):
Users are prompted to answer in the following structured format:
Problem Understanding — What is the core problem being solved?
Approach — What solution or design approach would you take?
Trade-offs — What are the limitations or trade-offs of your approach?
Decision — What would you recommend and why?
This structure makes rubric-based NLP evaluation reliable and consistent at the mastery level.
Goal:
Evaluate creativity and system design ability
Assess engineering thinking at mastery level

Phase 8: Final Output Generation
Best domain identified
Skill depth level (based on Bloom's levels reached)
Washington Accord attribute profile (aggregated from per-question PO tags)
Goal:
Provide a complete competency profile
Enable targeted career guidance

                START
                   ↓
     ┌──────────────────────────────┐
     │ Round 1: Domain Screening    │
     │ 4 Domains × 4–5 Questions    │
     │ (Mixed concepts inside)      │
     │ Bloom: L1–L2                 │
     │ WA: per-question tags        │
     └──────────────────────────────┘
                   ↓
     ┌──────────────────────────────────────┐
     │ Minimum Threshold Check              │
     │ All domains below baseline?          │
     │ → YES: Remedial Path output, END     │
     │ → NO: Continue                       │
     └──────────────────────────────────────┘
                   ↓
     ┌──────────────────────────────┐
     │ Aggregate Concept BKT        │
     │ → Domain Scores              │
     │ Rank Domains                 │
     └──────────────────────────────┘
                   ↓
     ┌──────────────────────────────┐
     │ Select Top 3 Domains         │
     └──────────────────────────────┘
                   ↓
     ┌────────────────────────────────────┐
     │ Round 2: Adaptive Domain Expansion │
     │ - If strong → more questions       │
     │ - If weak → reduce/stop            │
     │ Bloom: L3–L4                       │
     │ WA: per-question tags              │
     └────────────────────────────────────┘
                   ↓
     ┌──────────────────────────────┐
     │ Narrow to Top 2 Domains      │
     └──────────────────────────────┘
                   ↓
     ┌────────────────────────────────────┐
     │ Round 3: Advanced Domain Testing   │
     │ Case-based / complex problems      │
     │ Bloom: L4–L5                       │
     │ WA: per-question tags              │
     └────────────────────────────────────┘
                   ↓
     ┌──────────────────────────────┐
     │ Narrow to Best Domain        │
     └──────────────────────────────┘
                   ↓
     ┌────────────────────────────────────┐
     │ Final Round: Domain Mastery        │
     │ Structured template responses      │
     │ Bloom: L6                          │
     │ WA: per-question tags              │
     └────────────────────────────────────┘
                   ↓
     ┌──────────────────────────────┐
     │ Final Output                 │
     │ - Best Domain                │
     │ - Skill Depth Level          │
     │ - WA Attribute Profile       │
     └──────────────────────────────┘
                   ↓
                  END

Adaptive Logic
Next question depends on:
Previous answer correctness
Current concept-level BKT belief
Bloom's progression
Rules:
Correct → Increase difficulty / Bloom level for that concept
Incorrect → Decrease level or re-test same concept
Uncertain → Re-test similar concept at same level

3. Evaluation Engine
MCQ Evaluator
Binary correctness
Fast scoring
Result feeds directly into concept-level BKT update

Subjective Evaluator (Rubric-based NLP)
Replaces LLM-based evaluation entirely. All subjective answers — including L6 structured template responses — are evaluated using a deterministic rubric-based NLP pipeline.
How it works:
Each subjective question has a pre-defined rubric with:
Expected key concepts (must-have terms/ideas for full credit)
Supporting concepts (partial credit indicators)
Logical connectors (presence of reasoning structure, e.g., "because", "therefore", "trade-off")
Completeness check (are all template sections addressed for L6 questions?)
Scoring:
Component
Weight
Key concept coverage
50%
Supporting concept coverage
20%
Logical structure / connectors
20%
Completeness (L6 only)
10%

Outputs:
Normalized score (0–1)
Concept correctness flags (which key concepts were present/missing)
Attribute mapping (e.g., if logical connectors are strong → Communication attribute scores higher)
Advantages over LLM evaluation:
Fully deterministic — same answer always gets same score
No external API dependency or latency
No privacy concerns — answers never leave the system
Zero marginal cost at scale
Rubrics are auditable and adjustable by domain experts

Concept Mapper
Maps evaluated responses to:
Concept (specific, not just domain)
Domain (derived from concept)
Washington Accord Attribute(s) (from question tags)
Skill Attribute

4. BKT Engine (Belief System)
Belief State
BKT operates at the concept level (e.g., "Binary Search", "React Hooks", "Backpropagation"). Domain-level and attribute-level beliefs are derived by aggregating concept beliefs — not maintained independently.
Aggregation logic:
Domain belief = weighted average of concept beliefs within that domain
Attribute belief = average belief across concepts tagged to that attribute

Update Mechanism
After every answer, the relevant concept's belief is updated:
Correct → Increase concept belief
Incorrect → Decrease concept belief
Also accounts for:
Guessing probability (p_guess)
Slipping probability (p_slip)
Domain scores re-aggregate automatically after each concept update.

Usage
Drives next question selection (concept + difficulty)
Determines per-domain confidence (via aggregation)
Controls stopping logic per concept

Stopping Criteria
Stop probing a concept when:
Concept belief > upper threshold (mastery confirmed)
Concept belief < lower threshold (weakness confirmed — move on)
Sufficient concept coverage achieved for the domain
Stop a domain when:
All key concepts have resolved belief states
Domain ranking stabilizes across phases

5. Profiling Engine
Domain Profile
Confidence score per domain (aggregated from concept BKT beliefs)
Concept Profile
Strong vs weak concepts per domain
Belief score per concept
Attribute Profile (Washington Accord)
Per-PO score aggregated from all questions tagged with that PO
PO1 – Engineering Knowledge
PO2 – Problem Analysis
PO3 – Design / Development of Solutions
PO4 – Investigation of Problems
PO5 – Modern Tool Usage
PO8 – Ethics
Skill Attribute Profile
Problem Solving
Design
Analysis
Communication

Personality + Skill Fusion
Combines:
Personality vector (Stage 1) — used as a soft modifier
Skill confidence from BKT (Stage 2) — primary signal
Personality vector adjusts final role weightings slightly but does not override skill-based domain rankings.

6. Recommendation Engine
Role Mapping
Domain + Skill Attributes + Personality → Roles
Examples:
High analytical + DSA → Backend / SDE
High creativity + Web → Frontend
High analysis + ML → ML roles

Skill Gap Detection
Low-belief concepts (from BKT)
Weak WA attributes (from aggregated PO scores)

Output
Best-fit domains (ranked)
Role suggestions
Improvement areas (specific weak concepts + WA attributes)
Remedial path (if minimum threshold was not met in Phase 1)

7. Output Dashboard
Displays:
Domain Fit
Ranked domains with confidence scores
Personality Insights
Trait breakdown (with note that these are soft signals, not deterministic)
Skill Insights
Concept-level strengths & weaknesses
BKT belief scores per concept
Attribute Breakdown
Washington Accord PO scores
Skill attribute scores (Problem Solving, Design, Analysis, Communication)
Recommendations
Best-fit roles
Skill gap areas
Next steps / learning resources

8. Data Layer
Question Database
Fully tagged questions (Domain, Concept, Bloom's Level, multi-PO tags, Skill Attribute, Type)
Rubric definitions per subjective question (key concepts, supporting concepts, logical connectors)
User Response Store
Answers + rubric evaluation results
Belief Store
BKT probabilities per concept per user
Derived domain and attribute scores
Personality Store
Trait vectors

Final System Summary
Personality Layer → Sets soft initial direction (nudge, not gate)
Adaptive Quiz Engine → Explores & narrows domains via concept-level BKT
Evaluation Engine → Rubric-based NLP for all question types (no external LLM)
BKT Engine → Tracks concept-level confidence; aggregates to domain/attribute
Profiling Engine → Builds multi-dimensional profile (concept + domain + WA attributes)
Recommendation Engine → Outputs roles, skill gaps, and next steps
Remedial Path → Graceful fallback for users below foundational baseline

