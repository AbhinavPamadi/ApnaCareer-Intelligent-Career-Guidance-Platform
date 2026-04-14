import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';

import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Personality from './pages/Personality';
import QuizIntro from './pages/QuizIntro';
import Quiz from './pages/Quiz';
import Stage3Quiz from './pages/Stage3Quiz';
import Results from './pages/Results';
import Timeline from './pages/Timeline';
import Forum from './pages/Forum';
import Feedback from './pages/Feedback';
import News from './pages/News';
import ForumQnA from './pages/forum/ForumQnA';
import ForumMentorMatching from './pages/forum/ForumMentorMatching';
import ForumStudyBuddy from './pages/forum/ForumStudyBuddy';
import ForumRealityCheck from './pages/forum/ForumRealityCheck';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/personality" element={<ProtectedRoute><Personality /></ProtectedRoute>} />
          <Route path="/quiz/intro" element={<ProtectedRoute><QuizIntro /></ProtectedRoute>} />
          <Route path="/quiz" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
          <Route path="/quiz/stage3" element={<ProtectedRoute><Stage3Quiz /></ProtectedRoute>} />
          <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
          <Route path="/timeline" element={<ProtectedRoute><Timeline /></ProtectedRoute>} />
          <Route path="/forum" element={<ProtectedRoute><Forum /></ProtectedRoute>} />
          <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
          <Route path="/news" element={<ProtectedRoute><News /></ProtectedRoute>} />
          <Route path="/forum/q-and-a" element={<ProtectedRoute><ForumQnA /></ProtectedRoute>} />
          <Route path="/forum/peer-mentor-matching" element={<ProtectedRoute><ForumMentorMatching /></ProtectedRoute>} />
          <Route path="/forum/study-buddy-finder" element={<ProtectedRoute><ForumStudyBuddy /></ProtectedRoute>} />
          <Route path="/forum/reality-check" element={<ProtectedRoute><ForumRealityCheck /></ProtectedRoute>} />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
