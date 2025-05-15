// Initialize theme based on localStorage or system preference
(function() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

  // Apply theme immediately
  if (shouldBeDark) {
    document.documentElement.classList.add('dark');
    console.log('Theme initialized to dark mode');
  } else {
    document.documentElement.classList.remove('dark');
    console.log('Theme initialized to light mode');
  }

  // Add a debug helper to check theme state
  window.checkTheme = function() {
    const isDark = document.documentElement.classList.contains('dark');
    const savedTheme = localStorage.getItem('theme');
    console.log('Current theme class:', isDark ? 'dark' : 'light');
    console.log('Saved theme in localStorage:', savedTheme);
    return { isDark, savedTheme };
  };

  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      // Only auto-switch if user hasn't manually set a preference
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  });
})();
