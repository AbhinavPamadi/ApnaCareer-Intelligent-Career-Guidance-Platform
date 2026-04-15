import { useState, useEffect, useRef } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function Navbar() {
  const navigate = useNavigate();
  const themeMenuRef = useRef(null);
  const [themeMode, setThemeMode] = useState(() => {
    const savedMode = localStorage.getItem('apnaCareerThemeMode');
    if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') return savedMode;
    const legacyTheme = localStorage.getItem('apnaCareerTheme');
    if (legacyTheme === 'light' || legacyTheme === 'dark') return legacyTheme;
    return 'system';
  });
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [name, setName] = useState(() => {
    const cachedName = localStorage.getItem('apnaCareerUserName');
    if (cachedName) return cachedName;
    const currentUser = auth.currentUser;
    return currentUser?.displayName || currentUser?.email || '';
  });

  useEffect(() => {
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const nextDark = themeMode === 'system' ? systemPrefersDark : themeMode === 'dark';
    document.documentElement.classList.toggle('dark', nextDark);
    localStorage.setItem('apnaCareerThemeMode', themeMode);
    localStorage.setItem('apnaCareerTheme', nextDark ? 'dark' : 'light');
  }, [themeMode]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (themeMode === 'system') {
        const nextDark = media.matches;
        document.documentElement.classList.toggle('dark', nextDark);
        localStorage.setItem('apnaCareerTheme', nextDark ? 'dark' : 'light');
      }
    };

    media.addEventListener('change', handleSystemThemeChange);
    return () => media.removeEventListener('change', handleSystemThemeChange);
  }, [themeMode]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target)) {
        setIsThemeMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const immediateName = user.displayName || user.email;
          if (immediateName) {
            setName(immediateName);
            localStorage.setItem('apnaCareerUserName', immediateName);
          }
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) {
            const dbName = snap.data().name;
            if (dbName) {
              setName(dbName);
              localStorage.setItem('apnaCareerUserName', dbName);
            }
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
    localStorage.removeItem('apnaCareerUserName');
    navigate('/');
  };

  const themeModes = [
    { id: 'light', label: 'Light', icon: '☀️' },
    { id: 'dark', label: 'Dark', icon: '🌙' },
    { id: 'system', label: 'System', icon: '💻' },
  ];
  const activeThemeMeta = themeModes.find((mode) => mode.id === themeMode) || themeModes[2];

  const navLinkClass = ({ isActive }) =>
    `px-3 py-1.5 rounded-full text-sm font-semibold transition-colors duration-200 ${
      isActive
        ? 'bg-[var(--active-pill-bg)] text-[var(--active-pill-text)]'
        : 'text-[var(--nav-text)] hover:bg-[var(--tab-hover-bg)] hover:text-[var(--tab-hover-text)]'
    }`;

  return (
    <nav className="bg-[var(--nav-bg)] border-b border-[var(--nav-border)] relative z-20 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-xl font-extrabold tracking-tight text-[var(--brand-text)] transition-colors duration-200"
            >
              Apna Career
            </button>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <NavLink
              to="/dashboard"
              className={navLinkClass}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/timeline"
              className={navLinkClass}
            >
              Timelines
            </NavLink>
            <NavLink
              to="/results"
              className={navLinkClass}
            >
              Results
            </NavLink>
            <NavLink
              to="/forum"
              className={navLinkClass}
            >
              Forum
            </NavLink>
            <NavLink
              to="/feedback"
              className={navLinkClass}
            >
              Feedback
            </NavLink>
            <NavLink
              to="/news"
              className={navLinkClass}
            >
              News
            </NavLink>
          </div>
          <div className="flex items-center space-x-4">
            <div ref={themeMenuRef} className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setIsThemeMenuOpen((prev) => !prev)}
                className="inline-flex w-[122px] items-center justify-between rounded-full px-3 py-1.5 text-sm font-semibold text-[var(--nav-text)] hover:bg-[var(--tab-hover-bg)] transition-colors duration-200"
                aria-haspopup="menu"
                aria-expanded={isThemeMenuOpen}
              >
                <span className="inline-flex w-5 justify-center">{activeThemeMeta.icon}</span>
                <span className="flex-1 text-left">{activeThemeMeta.label}</span>
                <span className={`text-xs transition-transform duration-200 ${isThemeMenuOpen ? 'rotate-180' : ''}`}>▾</span>
              </button>
              <div
                className={`absolute right-0 mt-2 w-44 origin-top-right rounded-xl border bg-[var(--dropdown-bg)] border-[var(--dropdown-border)] shadow-[var(--dropdown-shadow)] p-1.5 transition-all duration-200 ease-out ${
                  isThemeMenuOpen ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-1 invisible pointer-events-none'
                }`}
                role="menu"
              >
                {themeModes.map((mode) => {
                  const isActive = mode.id === themeMode;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        setThemeMode(mode.id);
                        setIsThemeMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors duration-150 ${
                        isActive
                          ? 'font-bold text-[var(--dropdown-active-text)] bg-[var(--dropdown-active-bg)]'
                          : 'font-medium text-[var(--dropdown-text)] hover:bg-[var(--dropdown-hover-bg)]'
                      }`}
                      role="menuitem"
                    >
                      <span className="inline-flex items-center gap-2">
                        <span>{mode.icon}</span>
                        <span>{mode.label}</span>
                      </span>
                      <span className={`text-sm ${isActive ? 'opacity-100' : 'opacity-0'}`}>✓</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <span className="font-medium hidden sm:inline-block text-[var(--nav-text)]">Hello, {name || 'Student'}</span>
            <button 
              onClick={handleLogout} 
              className="text-sm font-bold px-3 py-1.5 rounded-full border border-[var(--logout-border)] text-[var(--logout-text)] hover:text-[var(--logout-hover-text)] hover:bg-[var(--logout-hover-bg)] transition-colors duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
