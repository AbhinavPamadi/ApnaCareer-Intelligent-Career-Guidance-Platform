import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-gray-800">
      <div className="max-w-4xl text-center space-y-8">
        <h1 className="text-5xl font-extrabold text-blue-600 tracking-tight">
          CareerCompass
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 font-medium">
          Find your engineering path
        </p>

        <div className="grid md:grid-cols-3 gap-8 mt-12 mb-12">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mb-4">1</div>
            <h3 className="text-lg font-bold mb-2">Personality Quiz</h3>
            <p className="text-gray-500 text-sm text-center">Take a personality quiz to match your cognitive traits with domain roles.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mb-4">2</div>
            <h3 className="text-lg font-bold mb-2">Technical Assessment</h3>
            <p className="text-gray-500 text-sm text-center">Complete an adaptive technical quiz to gauge your engineering competencies.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mb-4">3</div>
            <h3 className="text-lg font-bold mb-2">Career Roadmap</h3>
            <p className="text-gray-500 text-sm text-center">Get your personalized career roadmap and top roles within engineering setups.</p>
          </div>
        </div>

        <Link
          to="/auth"
          className="inline-block bg-blue-600 text-white font-bold text-lg px-8 py-4 rounded-full shadow-lg hover:bg-blue-700 transition"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
