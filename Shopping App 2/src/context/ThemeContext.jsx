import React, { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const theme = 'light';
  const isDark = false;
  const toggleTheme = () => {};

  useEffect(() => {
    // Luôn giữ Light Mode, loại bỏ các class và attribute dark mode
    try {
      localStorage.setItem('theme', 'light');
      document.documentElement.classList.remove('dark-theme', 'dark');
      document.documentElement.removeAttribute('data-theme');
      if (document.body) {
        document.body.classList.remove('dark-theme', 'dark');
        document.body.removeAttribute('data-theme');
      }
    } catch (e) {
      // ignore
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    return { theme: 'light', isDark: false, toggleTheme: () => {} };
  }
  return context;
};
