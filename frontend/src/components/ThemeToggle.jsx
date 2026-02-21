import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.button
      onClick={toggleTheme}
      className="relative w-9 h-9 rounded-lg border border-gray-200 bg-surface hover:border-brand-primary/40 hover:bg-brand/5 flex items-center justify-center transition-all duration-200"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      aria-label="Toggle theme"
    >
      {/* Sun Icon (Light Mode) */}
      <motion.svg
        className="absolute w-4 h-4 text-brand"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        initial={{ opacity: theme === 'light' ? 1 : 0, rotate: theme === 'light' ? 0 : 180 }}
        animate={{ opacity: theme === 'light' ? 1 : 0, rotate: theme === 'light' ? 0 : 180 }}
        transition={{ duration: 0.3 }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </motion.svg>

      {/* Moon Icon (Dark Mode) */}
      <motion.svg
        className="absolute w-4 h-4 text-brand"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        initial={{ opacity: theme === 'dark' ? 1 : 0, rotate: theme === 'dark' ? 0 : -180 }}
        animate={{ opacity: theme === 'dark' ? 1 : 0, rotate: theme === 'dark' ? 0 : -180 }}
        transition={{ duration: 0.3 }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </motion.svg>

    </motion.button>
  );
}
