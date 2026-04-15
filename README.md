# Engineering Career Assessment System  
### Personality + Adaptive Quiz + GitHub Evaluation

---

## Overview

The Engineering Career Assessment System is an intelligent platform designed to identify suitable engineering domains and career roles for users. It integrates personality analysis, adaptive assessment, and real-world project evaluation to generate a comprehensive skill profile.

The system combines:

- Personality Assessment (Stage 1)  
- Adaptive Quiz Engine using Bayesian Knowledge Tracing (Stage 2)  
- GitHub-Based Project Evaluation (Stage 3)  

to provide accurate, data-driven career recommendations.

---

## Objectives

- Evaluate users across multiple engineering domains  
- Measure conceptual understanding using adaptive techniques  
- Validate practical skills through GitHub project analysis  
- Provide structured career recommendations and improvement paths  

---

## System Architecture



---

## Core Components

### 1. Personality Assessment (Stage 1)

- Collects user responses through a structured questionnaire  
- Extracts traits such as analytical ability, creativity, and work preferences  
- Generates a personality vector  
- Provides soft domain priors to guide the assessment  

---

### 2. Adaptive Quiz Engine (Stage 2)

The adaptive engine evaluates users dynamically using Bayesian Knowledge Tracing (BKT) at the concept level.

#### Domains Covered

- Data Structures and Algorithms  
- Web Development  
- Machine Learning  
- Systems  

#### Key Features

- Concept-level knowledge tracking  
- Dynamic difficulty adjustment  
- Bloom’s Taxonomy integration (L1–L6)  
- Washington Accord attribute mapping (PO1–PO8)  

---

### 3. Evaluation Engine

#### MCQ Evaluation

- Binary correctness-based scoring  
- Immediate update to concept-level belief  

#### Subjective Evaluation

- Deterministic rubric-based NLP system  
- No dependency on external LLM APIs  

##### Scoring Criteria

- Key concept coverage (50%)  
- Supporting concepts (20%)  
- Logical structure (20%)  
- Completeness (10%)  

---

### 4. Profiling Engine

Generates a multi-dimensional profile including:

- Domain confidence scores  
- Concept-level strengths and weaknesses  
- Washington Accord attribute scores  
- Skill attributes such as problem solving, design, and communication  

---

### 5. GitHub-Based Evaluation (Stage 3)

Evaluates real-world projects to validate user skills.

#### Analysis Includes

- Project structure and architecture  
- Code quality and modularity  
- Technology usage  
- Commit history and authenticity  

#### Outcomes

- Skill extraction from projects  
- Gap detection between assessed and actual skills  
- Dynamic generation of project-specific questions  
- Confidence adjustment based on responses  

---

### 6. Recommendation Engine

Provides:

- Ranked domain suitability  
- Role recommendations  
- Skill gap identification  
- Suggested learning pathways  

---

## Adaptive Workflow

1. Domain Screening  
2. Domain Ranking  
3. Adaptive Expansion  
4. Domain Narrowing  
5. Advanced Evaluation  
6. Final Domain Selection  
7. Mastery Assessment  
8. Final Output Generation  

---

## GitHub Evaluation Workflow


---

## Data Layer

- Question Database (tagged by domain, concept, Bloom level, and attributes)  
- User Response Store  
- BKT Belief Store  
- Personality Data Store  
- GitHub Analysis Data  

---

## Output Dashboard

The system provides:

- Ranked domain suitability  
- Personality insights  
- Concept-level performance analysis  
- Washington Accord attribute breakdown  
- Career recommendations  
- Identified skill gaps  
- Suggested improvement paths  

---

## Technology Stack (Suggested)

- Frontend: React / Next.js with TailwindCSS  
- Backend: Node.js or FastAPI  
- Database: Firebase or PostgreSQL  
- Core Logic: Bayesian Knowledge Tracing and NLP-based evaluation  
- Visualization: Recharts or Chart.js  

---

## Key Highlights

- Concept-level adaptive assessment  
- Integration of Bloom’s Taxonomy and Washington Accord standards  
- Deterministic evaluation without reliance on external LLMs  
- Real-world validation through GitHub project analysis  
- Support for remedial learning pathways  

---

## Future Enhancements

- Resume and LinkedIn integration  
- Real-time performance tracking dashboard  
- Industry benchmarking  
- AI-assisted mentoring system  
- Multi-language support  



