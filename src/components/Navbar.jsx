import { useState, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function Navbar() {
  const navigate = useNavigate();
  const [name, setName] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) {
            setName(snap.data().name);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <nav className="bg-white/95 backdrop-blur shadow-sm border-b border-gray-100 relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text"
            >
              Apna Career
            </button>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                  isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/timeline"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                  isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`
              }
            >
              Timelines
            </NavLink>
            <NavLink
              to="/results"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                  isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`
              }
            >
              Results
            </NavLink>
            <NavLink
              to="/forum"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                  isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`
              }
            >
              Forum
            </NavLink>
            <NavLink
              to="/feedback"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                  isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`
              }
            >
              Feedback
            </NavLink>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700 font-medium hidden sm:inline-block">Hello, {name || 'Student'}</span>
            <button 
              onClick={handleLogout} 
              className="text-sm font-bold text-gray-500 hover:text-gray-900 border px-3 py-1.5 rounded-full hover:bg-gray-50 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
