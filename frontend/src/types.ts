export type Question = {
    id: string;
    domain: string;
    concept: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    bloomLevel: string;
    attribute: string;
    type: 'MCQ' | 'Subjective';
    content: string;
    options?: string[];
    correctAnswer?: string;
};
