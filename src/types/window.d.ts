interface Window {
  checkTheme?: () => { isDark: boolean; savedTheme: string | null };
  forceThemeRefresh?: () => string;
}
