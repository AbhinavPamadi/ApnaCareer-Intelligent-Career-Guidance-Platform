import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <nav className="bg-white shadow relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <span className="text-xl font-extrabold text-blue-600 tracking-tight">CareerCompass</span>
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
