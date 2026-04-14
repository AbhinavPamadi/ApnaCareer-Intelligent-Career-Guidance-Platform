import { useNavigate } from 'react-router-dom';

export default function QuizIntro() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-lg w-full rounded-xl shadow border border-gray-100 p-8 text-center space-y-6">
        <h2 className="text-3xl font-extrabold text-blue-600">Technical Assessment</h2>
        <p className="text-gray-600 text-lg">
          You are about to start the adaptive technical assessment. 
          Questions will adjust dynamically based on your performance to accurately measure your engineering competency framework.
        </p>
        <button
          onClick={() => navigate('/quiz')}
          className="bg-blue-600 text-white font-bold px-8 py-3 rounded-full shadow-lg hover:bg-blue-700 transition w-full mt-4"
        >
          Begin Quiz
        </button>
      </div>
    </div>
  );
}
