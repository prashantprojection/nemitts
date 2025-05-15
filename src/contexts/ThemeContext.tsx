import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'light-blue' | 'light-green' | 'blue' | 'purple' | 'red';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check if theme is stored in localStorage
    const storedTheme = localStorage.getItem('theme') as Theme;

    // If theme is stored and it's a valid theme, use it
    if (storedTheme && ['light', 'dark', 'light-blue', 'light-green', 'blue', 'purple', 'red'].includes(storedTheme)) {
      return storedTheme;
    }

    // Otherwise, check for system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    // Default to light theme
    return 'light';
  });

  useEffect(() => {
    // Remove all theme classes
    document.documentElement.classList.remove(
      'light', 'dark', 'light-blue', 'light-green', 'blue', 'purple', 'red'
    );

    // Add the current theme class
    document.documentElement.classList.add(theme);

    // Store the theme in localStorage
    localStorage.setItem('theme', theme);

    // Log theme change for debugging
    console.log('Theme changed to:', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
