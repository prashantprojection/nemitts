import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';

// NOTE: This component is no longer used directly in the UI.
// The theme toggle functionality has been integrated into the ProfileMenu component.
// This file is kept for reference and potential future standalone use.

// Custom event to notify theme changes
const dispatchThemeChangeEvent = (theme: 'light' | 'dark') => {
  const event = new CustomEvent('theme-changed', {
    detail: { theme }
  });
  window.dispatchEvent(event);
  console.log('Dispatched theme change event:', theme);
};

const ThemeToggle = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    let currentTheme: 'light' | 'dark';

    if (savedTheme) {
      currentTheme = savedTheme;
      console.log('Using saved theme:', currentTheme);
    } else {
      // Check system preference
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      currentTheme = systemPrefersDark ? 'dark' : 'light';
      console.log('Using system preference theme:', currentTheme);
      // Save to localStorage
      localStorage.setItem('theme', currentTheme);
    }

    // Update state
    setTheme(currentTheme);

    // Apply theme to document
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Dispatch initial theme
    dispatchThemeChangeEvent(currentTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    console.log('Toggling theme to:', newTheme);

    // Update state immediately
    setTheme(newTheme);

    // Apply theme change to document
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Save to localStorage
    localStorage.setItem('theme', newTheme);

    // Dispatch theme change event
    dispatchThemeChangeEvent(newTheme);
  };

  // No force refresh theme function needed anymore

  return (
    <div className="flex h-full">
      <Button
        variant="outline"
        size="sm"
        onClick={toggleTheme}
        className={`h-full rounded-none px-4 border-l transition-colors
          ${theme === 'dark'
            ? 'text-yellow-300 border-border/50 hover:bg-muted/30 hover:text-yellow-200'
            : 'text-primary border-border/50 hover:bg-primary/10 hover:text-primary/90'}`}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
};

export default ThemeToggle;
