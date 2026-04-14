import { useNavigate } from 'react-router-dom';

export default function QuizIntro() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-lg w-full rounded-xl shadow-sm border border-gray-100 p-8 text-center space-y-6">
        <h2 className="text-3xl font-extrabold text-gray-900 border-b border-gray-100 pb-4">
          Personality assessment complete!
        </h2>
        
        <p className="text-gray-600 text-lg font-medium leading-relaxed pt-2">
          You'll now take an adaptive technical quiz. Questions adapt to your responses. 
          ~20–40 questions depending on your performance.
        </p>
        
        <div className="pt-6">
          <button
            onClick={() => navigate('/quiz')}
            className="w-full bg-blue-600 text-white font-bold px-8 py-4 rounded-lg shadow-sm hover:bg-blue-700 transition text-lg"
          >
            Begin Quiz
          </button>
        </div>
      </div>
    </div>
  );
}
