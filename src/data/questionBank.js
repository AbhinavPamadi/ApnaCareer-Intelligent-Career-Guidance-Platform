import phase1Questions from '../../questionnaire/domain_phase1.json';
import phase2Questions from '../../questionnaire/domain_phase2.json';
import phase3Questions from '../../questionnaire/domain_phase3.json';

// Ensure backward compatibility of 'type' if needed, but our new questionSelector expects 'mcq', 'short', 'long'
export const questionBank = [
  ...phase1Questions,
  ...phase2Questions,
  ...phase3Questions,
];
