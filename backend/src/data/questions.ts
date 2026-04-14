import { Question } from '../types';

export const mockQuestions: Question[] = [
    {
        id: 'q1', domain: 'DSA', concept: 'Arrays', difficulty: 'Easy', bloomLevel: 'Remember', attribute: 'PO1', type: 'MCQ',
        content: 'Which data structure stores elements in contiguous memory locations?', options: ['Linked List', 'Array', 'Tree', 'Graph'], correctAnswer: 'Array'
    },
    {
        id: 'q2', domain: 'Web Development', concept: 'HTML', difficulty: 'Easy', bloomLevel: 'Understand', attribute: 'PO1', type: 'MCQ',
        content: 'What is the purpose of the <body> tag?', options: ['Metadata', 'Scripts', 'Visible Content', 'Styling'], correctAnswer: 'Visible Content'
    },
    {
        id: 'q3', domain: 'Machine Learning', concept: 'Supervised Learning', difficulty: 'Easy', bloomLevel: 'Understand', attribute: 'PO1', type: 'MCQ',
        content: 'Which of these is explicitly given in supervised learning?', options: ['Labeled Data', 'Random Noise', 'Clustered Data', 'Priors'], correctAnswer: 'Labeled Data'
    },
    {
        id: 'q4', domain: 'Systems', concept: 'Ports', difficulty: 'Easy', bloomLevel: 'Remember', attribute: 'PO1', type: 'MCQ',
        content: 'Which port is historically used for HTTP traffic?', options: ['443', '22', '80', '21'], correctAnswer: '80'
    },
    {
        id: 'q5', domain: 'DSA', concept: 'Graphs', difficulty: 'Medium', bloomLevel: 'Apply', attribute: 'PO2', type: 'MCQ',
        content: 'Which search algorithm uses a queue?', options: ['DFS', 'BFS', 'Binary Search', 'A*'], correctAnswer: 'BFS'
    },
    {
        id: 'q6', domain: 'Web Development', concept: 'React State', difficulty: 'Medium', bloomLevel: 'Analyze', attribute: 'PO5', type: 'MCQ',
        content: 'Why should you avoid mutating state directly in React?', options: ['Security vulnerability', 'Breaks reconciliation', 'Faster performance', 'Saves memory'], correctAnswer: 'Breaks reconciliation'
    },
    {
        id: 'q7', domain: 'Machine Learning', concept: 'Overfitting', difficulty: 'Hard', bloomLevel: 'Analyze', attribute: 'PO2', type: 'MCQ',
        content: 'To correct high variance in a model, one could:', options: ['Remove regularizers', 'Increase model complexity', 'Add Dropout / L2', 'Increase epochs'], correctAnswer: 'Add Dropout / L2'
    },
    {
        id: 'q8', domain: 'Systems', concept: 'Caching', difficulty: 'Medium', bloomLevel: 'Apply', attribute: 'PO3', type: 'MCQ',
        content: 'In LRU cache design, what data structure guarantees O(1) eviction?', options: ['Linked List + HashMap', 'Binary Tree', 'Stack', 'Array'], correctAnswer: 'Linked List + HashMap'
    },
    {
        id: 'q9', domain: 'DSA', concept: 'Dynamic Programming', difficulty: 'Hard', bloomLevel: 'Evaluate', attribute: 'PO3', type: 'Subjective',
        content: 'Design an algorithm to find the longest palindromic substring optimally. Evaluate its time complexity based on space trade-offs.'
    },
    {
        id: 'q10', domain: 'Systems', concept: 'Microservices', difficulty: 'Hard', bloomLevel: 'Create', attribute: 'PO3', type: 'Subjective',
        content: 'Design a distributed rate limiter for a global API gateway serving 10M RPM.'
    }
];

export const personalityQuestions = [
    { id: 'p1', text: 'I break problems into logical steps before acting.', trait: 'analytical' as const },
    { id: 'p2', text: 'I enjoy designing intuitive aesthetics.', trait: 'creative' as const },
    { id: 'p3', text: 'I care more about how the system scales than looks.', trait: 'structured' as const },
    { id: 'p4', text: 'I love trying out new tangible prototypes fast.', trait: 'practical' as const }
];
