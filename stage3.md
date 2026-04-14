# **Stage 3: GitHub-Based Evaluation & Intelligent Questioning**

## **Goal**

Move beyond quiz-based assessment and evaluate a student’s **real-world skills** by analyzing their GitHub projects. Then generate **targeted questions** to verify actual understanding.

---

## **Why this stage exists**

A student might:

* Score well in quizzes but not build anything
* Copy projects without understanding them
* Overestimate their skill level

This stage checks:

> “Can you actually explain and justify what you’ve built?”

---

## **Input**

* GitHub profile or repository link
* Public project data (code, README, commits, structure)

---

## **Step 1: Repository Analysis**

The system extracts key signals from the repo:

### **1. Project Metadata**

* Project name, description
* Technologies used (React, Python, etc.)
* README quality

### **2. Code Structure**

* File organization
* Modularity (functions, components, reuse)
* Presence of architecture (MVC, layers, etc.)

### **3. Code Quality**

* Naming conventions
* Complexity of logic
* Error handling
* Comments and documentation

### **4. Activity & Authenticity Signals**

* Commit frequency
* Commit messages
* Timeline consistency

---

## **Step 2: Skill Extraction**

From the repo, the system infers:

* **Technical skills** (e.g., React, APIs, databases)
* **Conceptual depth** (basic vs advanced usage)
* **Problem-solving ability**
* **Project complexity level**

Output example:

```
{
  frontend: intermediate,
  backend: beginner,
  problem_solving: moderate,
  system_design: low
}
```

---

## **Step 3: Gap Detection**

Now compare:

* Quiz/BKT-based belief (Stage 2)
* GitHub-based inferred skill

### Cases:

* **Match** → confidence increases
* **Mismatch** → deeper probing required

Example:

* Quiz says “high backend skill”
* Repo shows only basic CRUD
  → system flags inconsistency

---

## **Step 4: Dynamic Question Generation**

This is the core of the stage.

Instead of generic questions, the system generates:

> **Project-specific, context-aware questions**

---

### **Types of Questions Generated**

#### **1. Conceptual Understanding**

* “Why did you choose this framework?”
* “What problem does this architecture solve?”

#### **2. Implementation-Based**

* “Explain how authentication works in your project”
* “How does this API handle errors?”

#### **3. Depth Testing**

* “What would break if X fails?”
* “How would you scale this system?”

#### **4. Ownership Verification**

* “What challenges did you face while building this?”
* “Why did you structure your folders this way?”

---

## **Step 5: Adaptive Question Flow**

Questions are not fixed.

The system:

* Starts with moderate difficulty
* Adjusts based on responses

### If student answers well:

→ deeper/system design questions

### If student struggles:

→ fallback to fundamentals

---

## **Step 6: Evaluation of Responses**

Responses are evaluated for:

* Correctness
* Depth of explanation
* Clarity
* Practical understanding

---

## **Step 7: Confidence Adjustment**

Final belief about the student is updated:

* If answers align with repo → confidence increases
* If not → reduces trust in earlier stages

This updates:

* Skill levels
* Domain suitability

---

## **Final Output of Stage 3**

* Verified skill profile
* Adjusted domain fit
* Weak areas identified
* Strong areas confirmed

---

