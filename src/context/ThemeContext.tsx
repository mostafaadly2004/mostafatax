import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'dark' | 'light' | 'high-contrast';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  cycleTheme: () => void;
  isDark: boolean;
  isLight: boolean;
  isHighContrast: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('reta_app_theme') as ThemeMode;
      if (saved === 'light' || saved === 'dark' || saved === 'high-contrast') {
        return saved;
      }
    } catch (e) {
      // ignore
    }
    return 'dark'; // default theme
  });

  const applyThemeToDOM = (newTheme: ThemeMode) => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light', 'high-contrast');
    root.classList.add(newTheme);
    root.setAttribute('data-theme', newTheme);
    
    // Also update body background for immediate visual feedback
    if (newTheme === 'light') {
      document.body.style.backgroundColor = '#f8fafc';
      document.body.style.color = '#0f172a';
    } else if (newTheme === 'high-contrast') {
      document.body.style.backgroundColor = '#000000';
      document.body.style.color = '#ffffff';
    } else {
      document.body.style.backgroundColor = '#020617';
      document.body.style.color = '#f8fafc';
    }
  };

  useEffect(() => {
    applyThemeToDOM(theme);
    try {
      localStorage.setItem('reta_app_theme', theme);
    } catch (e) {
      // ignore
    }
  }, [theme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  // Toggle between dark and light
  const toggleTheme = () => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Cycle through all 3 modes: dark -> light -> high-contrast -> dark
  const cycleTheme = () => {
    setThemeState(prev => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'high-contrast';
      return 'dark';
    });
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        cycleTheme,
        isDark: theme === 'dark',
        isLight: theme === 'light',
        isHighContrast: theme === 'high-contrast',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
