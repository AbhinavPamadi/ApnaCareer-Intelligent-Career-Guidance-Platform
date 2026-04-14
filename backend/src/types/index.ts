export type Domain = 'DSA' | 'Web Development' | 'Machine Learning' | 'Systems';

// Bloom's levels loosely mapped to L1-L6
export type BloomLevel = 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create';

// Washington Accord Graduate Attributes
export type WAAttribute = 'PO1' | 'PO2' | 'PO3' | 'PO4' | 'PO5' | 'PO8';

export type QuizPhase =
    | 'Screening' // Round 1: All domains
    | 'Expansion' // Round 2: Top 3 domains
    | 'Advanced' // Round 3: Top 2 domains
    | 'Mastery'; // Round 4: Top 1 domain

export interface User {
    id: string;
    name: string;
}

export interface Question {
    id: string;
    domain: Domain;
    concept: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    bloomLevel: BloomLevel;
    attribute: WAAttribute;
    type: 'MCQ' | 'Subjective';
    content: string;
    options?: string[]; // Empty for subjective
    correctAnswer?: string; // For MCQ
}

export interface Response {
    id: string;
    userId: string;
    questionId: string;
    answer: string;
    isCorrect: boolean;
    score: number;
}

export interface BeliefState {
    userId: string;
    concept: string; // The literal string of the domain, concept, or PO
    probability: number; // 0 to 1
    conceptType: 'Concept' | 'Domain' | 'Attribute';
}

export interface PersonalityTraits {
    analytical: number;
    creative: number;
    practical: number;
    teamOriented: number;
    structured: number;
}

export type DomainPriors = {
    [K in Domain]?: number;
};

export interface UserProfile {
    userId: string;
    bestDomain: Domain | null;
    personality: PersonalityTraits;
    domainPriors: DomainPriors;
    domainScores: Record<string, number>;
    conceptStrengths: Record<string, number>;
    attributeScores: Record<string, number>;
}
