import React from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, LogOut, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Header({ currentBoard, onBackClick }) {
  const { user, signOut } = useAuth();
  const [isDarkMode, setIsDarkMode] = React.useState(
    document.documentElement.classList.contains('dark')
  );

  const toggleDarkMode = () => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  // Get user initial from real user info
  const userInitial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.email
    ? user.email.charAt(0).toUpperCase()
    : 'U';
  const userTooltip = user?.name || user?.email || '';

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 font-bold text-xl text-gray-900 dark:text-white hover:opacity-75 transition-opacity flex-shrink-0"
        >
          <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <span className="hidden sm:inline">TaskTracker</span>
        </Link>

        {/* Center: Board Name */}
        {currentBoard && (
          <div className="flex items-center gap-2 flex-1 min-w-0 px-4">
            {onBackClick && (
              <button
                onClick={onBackClick}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
              {currentBoard}
            </span>
          </div>
        )}

        {/* Right: Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Theme Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            title={isDarkMode ? 'Light mode' : 'Dark mode'}
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>

          {/* User Avatar */}
          <div
            className="w-9 h-9 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center"
            title={userTooltip}
          >
            <span className="text-white font-medium text-sm">{userInitial}</span>
          </div>

          {/* Sign Out */}
          <button
            onClick={signOut}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
