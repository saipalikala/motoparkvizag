import { createContext, useContext, useState } from 'react';

const AdminThemeContext = createContext();

const THEME_KEY = 'admin-theme';

export function AdminThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
      
      // Respect OS preference on first visit
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    } catch {
      // ignore
    }
    // Default to dark mode otherwise
    return 'dark';
  });

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <AdminThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={`admin-theme-wrapper admin-theme-${theme}`}>
        {children}
      </div>
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const context = useContext(AdminThemeContext);
  if (!context) {
    throw new Error('useAdminTheme must be used within an AdminThemeProvider');
  }
  return context;
}
