import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import './ThemeToggle.css';

export const ThemeToggle = ({ className = '' }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className={`cyber-theme-toggle-btn ${isDark ? 'is-dark' : 'is-light'} ${className}`}
      onClick={toggleTheme}
      title={isDark ? 'Chuyển sang Giao diện Sáng (Light Mode)' : 'Chuyển sang Giao diện Tối (Dark Mode)'}
      aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
    >
      <div className="theme-toggle-icon-wrapper">
        {isDark ? (
          <Sun size={20} className="theme-icon sun-icon" strokeWidth={2} />
        ) : (
          <Moon size={20} className="theme-icon moon-icon" strokeWidth={2} />
        )}
      </div>
    </button>
  );
};

export default ThemeToggle;

