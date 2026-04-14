# BKT Engine + Rubric NLP Scorer — Logic Document
## Engineering Career Assessment System

---

## Part 1: Bayesian Knowledge Tracing (BKT) Engine

### Overview

BKT maintains a belief score (0.0 to 1.0) for each concept per user.
- 0.0 = definitely does not know this concept
- 1.0 = definitely knows this concept

Domain scores and attribute scores are derived by aggregating concept beliefs. They are never tracked independently.

---

### BKT Parameters (per concept)

| Parameter | Symbol | Meaning | Default Value |
|---|---|---|---|
| Initial knowledge | p_init | Probability student already knows concept before quiz | 0.3 |
| Learning rate | p_learn | Probability student learns concept after answering | 0.2 |
| Guess probability | p_guess | Probability of correct answer despite not knowing | 0.2 |
| Slip probability | p_slip | Probability of wrong answer despite knowing | 0.1 |

These defaults apply to all concepts. They can be tuned per concept later.

---

### BKT Update Formula

After each answer, update the concept belief as follows:

```
FUNCTION updateBelief(currentBelief, isCorrect):

  IF isCorrect:
    likelihood = (currentBelief * (1 - p_slip)) + ((1 - currentBelief) * p_guess)
    posterior = (currentBelief * (1 - p_slip)) / likelihood

  ELSE:
    likelihood = (currentBelief * p_slip) + ((1 - currentBelief) * (1 - p_guess))
    posterior = (currentBelief * p_slip) / likelihood

  # Account for learning
  updatedBelief = posterior + ((1 - posterior) * p_learn)

  RETURN CLAMP(updatedBelief, 0.0, 1.0)
```

---

### Domain Score Aggregation

```
FUNCTION getDomainScore(domain, conceptBeliefs):

  relevantConcepts = all concepts where concept.domain == domain
  
  IF relevantConcepts is empty:
    RETURN domainPrior[domain]   # fall back to personality prior if no questions asked yet
  
  RETURN AVERAGE(belief for each concept in relevantConcepts)
```

---

### WA Attribute Score Aggregation

```
FUNCTION getAttributeScore(poAttribute, conceptBeliefs, answeredQuestions):

  relevantQuestions = all answered questions where poAttribute in question.waAttributes
  
  IF relevantQuestions is empty:
    RETURN 0.5   # neutral default
  
  conceptsForAttribute = unique concepts from relevantQuestions
  
  RETURN AVERAGE(belief for each concept in conceptsForAttribute)
```

---

### Stopping Criteria Per Concept

```
UPPER_THRESHOLD = 0.85   # mastery confirmed
LOWER_THRESHOLD = 0.2    # weakness confirmed
MAX_QUESTIONS_PER_CONCEPT = 4

FUNCTION shouldStopConcept(concept, belief, questionsAsked):
  IF belief >= UPPER_THRESHOLD: RETURN "mastered"
  IF belief <= LOWER_THRESHOLD: RETURN "weak"
  IF questionsAsked >= MAX_QUESTIONS_PER_CONCEPT: RETURN "sufficient"
  RETURN "continue"
```

---

### Next Question Selection Logic

```
FUNCTION selectNextQuestion(user, phase, activeDomains):

  1. Get all concepts in activeDomains that are still "continue" (not stopped)
  
  2. Filter question bank:
     - domain must be in activeDomains
     - concept must not be stopped
     - question must not already be answered by user
     - bloomLevel must match current phase range (see phase table below)
  
  3. Score each candidate question:
     - prefer concepts with belief closest to 0.5 (most uncertain = most informative)
     - prefer lower difficulty if belief < 0.4
     - prefer higher difficulty if belief > 0.6
  
  4. Apply soft personality prior nudge:
     - multiply candidate score by (1 + 0.1 * domainPrior[domain])
     - this gives a small boost to personality-preferred domains, not a hard redirect
  
  5. Select highest-scoring candidate question
  
  6. RETURN question

PHASE → BLOOM LEVEL MAPPING:
  Phase 1 (Screening):         L1–L2 (Remember, Understand)
  Phase 3 (Expansion):         L3–L4 (Apply, Analyze)
  Phase 5 (Advanced):          L4–L5 (Analyze, Evaluate)
  Phase 7 (Mastery):           L6    (Create)
```

---

### Phase Transition Logic

```
MINIMUM_THRESHOLD = 0.25   # below this in ALL domains = remedial path

AFTER PHASE 1:
  IF all domainScores < MINIMUM_THRESHOLD:
    TRIGGER remedial path
    END quiz
  ELSE:
    rank domains by score
    activeDomains = top 3 domains
    advance to Phase 3

AFTER PHASE 3:
  rank activeDomains by updated score
  activeDomains = top 2 domains
  advance to Phase 5

AFTER PHASE 5:
  bestDomain = highest scoring domain
  activeDomains = [bestDomain]
  advance to Phase 7

AFTER PHASE 7:
  generate final results
  END quiz
```

---

## Part 2: Rubric-Based NLP Scorer

### Overview

Used for all subjective question types (Subjective and SubjectiveStructured).
No external API. Pure keyword/concept matching with logical structure detection.
Fully deterministic — same answer = same score every time.

---

### Scoring for Standard Subjective Questions

```
FUNCTION scoreSubjective(answerText, rubric):

  answerLower = answerText.toLowerCase()
  
  # 1. Key concept coverage (50%)
  keyCoverage = COUNT(concepts in rubric.keyConcepts that appear in answerLower)
                / COUNT(rubric.keyConcepts)
  
  # 2. Supporting concept coverage (20%)
  supportCoverage = COUNT(concepts in rubric.supportingConcepts that appear in answerLower)
                    / COUNT(rubric.supportingConcepts)
  
  # 3. Logical connector presence (20%)
  connectorsFound = COUNT(connectors in rubric.logicalConnectors that appear in answerLower)
  logicScore = MIN(connectorsFound / 2, 1.0)   # max out at 2 connectors found
  
  # 4. Minimum word count check (10%)
  wordCount = COUNT(words in answerText)
  completenessScore = 1.0 IF wordCount >= rubric.minWordCount ELSE (wordCount / rubric.minWordCount)
  
  # Final score
  finalScore = (keyCoverage * 0.5)
             + (supportCoverage * 0.2)
             + (logicScore * 0.2)
             + (completenessScore * 0.1)
  
  RETURN {
    score: ROUND(finalScore, 2),
    conceptsMatched: [matched key concepts],
    conceptsMissed: [missed key concepts],
    isCorrect: finalScore >= 0.6   # threshold for "correct"
  }
```

---

### Scoring for L6 Structured Template Questions

Each of the 4 fields is scored independently, then combined.

```
FUNCTION scoreStructured(answerStructured, rubric):

  sectionScores = {}
  
  FOR EACH section IN ["problemUnderstanding", "approach", "tradeoffs", "decision"]:
    
    sectionText = answerStructured[section].toLowerCase()
    sectionRubric = rubric[section]
    
    # Key concept match for this section
    matched = COUNT(concepts in sectionRubric.keyConcepts that appear in sectionText)
    coverage = matched / COUNT(sectionRubric.keyConcepts)
    
    # Minimum length check (each section min 15 words)
    wordCount = COUNT(words in answerStructured[section])
    lengthPenalty = 1.0 IF wordCount >= 15 ELSE 0.5
    
    sectionScores[section] = ROUND(coverage * lengthPenalty, 2)
  
  # Weighted combine using rubric weights (0.25 each = equal weight by default)
  finalScore = SUM(sectionScores[section] * rubric[section].weight for each section)
  
  RETURN {
    score: ROUND(finalScore, 2),
    sectionScores: sectionScores,
    isCorrect: finalScore >= 0.55
  }
```

---

### Concept Matching Implementation Notes

- Use simple `string.includes()` / `indexOf()` matching — no stemming needed for v1
- For multi-word concepts (e.g., "gradient descent"), check for the full phrase
- Case-insensitive always
- Answer text should be stripped of punctuation before matching

Example concept matching:
```
keyConcepts = ["learning rate", "convergence", "gradient", "step size"]
answer = "The learning rate determines how quickly the model converges by controlling the step size..."

matched = ["learning rate", "convergence", "step size"]   ✓
missed  = ["gradient"]                                    ✗
coverage = 3/4 = 0.75
```

---

### Attribute Mapping from Subjective Scores

After scoring, map the result to skill attributes:

```
FUNCTION mapToSkillAttribute(question, evaluationResult):

  IF question.skillAttribute == "Communication":
    # boost communication score if logicScore is high
    communicationContribution = evaluationResult.logicScore

  IF question.skillAttribute == "Analysis":
    # analysis is purely concept coverage
    analysisContribution = evaluationResult.keyCoverage

  IF question.skillAttribute == "Design":
    # design uses overall score weighted by section completeness (L6 only)
    designContribution = evaluationResult.score

  IF question.skillAttribute == "Problem Solving":
    problemSolvingContribution = evaluationResult.score

  RETURN contribution value to be averaged into user's skill attribute profile
```

---

## Part 3: Competency Level Classification

After all BKT beliefs are finalized, classify the user's overall competency:

```
bestDomainScore = domainScores[bestDomain]

IF bestDomainScore >= 0.80: competencyLevel = "Advanced"
IF bestDomainScore >= 0.65: competencyLevel = "Proficient"
IF bestDomainScore >= 0.45: competencyLevel = "Developing"
IF bestDomainScore <  0.45: competencyLevel = "Foundational"
```

---

## Part 4: Role Mapping Table

```
FUNCTION suggestRoles(bestDomain, skillAttributes, personalityVector):

  roles = []

  IF bestDomain == "DSA":
    IF skillAttributes.problemSolving >= 0.7: roles.add("Software Development Engineer")
    IF skillAttributes.analysis >= 0.7: roles.add("Backend Engineer")
    IF personalityVector.analytical >= 0.7: roles.add("Systems Programmer")

  IF bestDomain == "WebDev":
    IF personalityVector.creativity >= 0.6: roles.add("Frontend Engineer")
    IF skillAttributes.design >= 0.65: roles.add("UI/UX Engineer")
    roles.add("Full Stack Developer")

  IF bestDomain == "ML":
    IF skillAttributes.analysis >= 0.7: roles.add("ML Engineer")
    IF skillAttributes.problemSolving >= 0.7: roles.add("Data Scientist")
    roles.add("AI/ML Researcher")

  IF bestDomain == "Systems":
    roles.add("Systems Engineer")
    IF personalityVector.practical >= 0.7: roles.add("DevOps Engineer")
    IF skillAttributes.design >= 0.65: roles.add("Cloud Infrastructure Engineer")

  RETURN top 3 from roles (deduplicated)
```
