import { useSettings } from '@/contexts/SettingsContext';

/**
 * A hook for using theme settings from the settings context
 *
 * @returns Theme settings and functions to update them
 */
export function useThemeSettingsContext() {
  const {
    themeSettings,
    updateThemeSetting,
    saveThemeSettings,
    resetThemeSettings,
    isLoading,
    isSaving
  } = useSettings();

  // Generate URL for OBS Browser Source
  const generateUrl = (baseUrl: string = window.location.origin) => {
    // Make sure to stringify the settings properly
    const themeJson = JSON.stringify(themeSettings);
    console.log('Generating OBS URL with theme settings:', themeJson);

    // Create the URL with properly encoded theme parameter
    const url = `${baseUrl}/obs?theme=${encodeURIComponent(themeJson)}`;
    console.log('Generated OBS URL:', url);

    return url;
  };

  return {
    settings: themeSettings,
    updateSetting: updateThemeSetting,
    saveSettings: saveThemeSettings,
    resetToDefaults: resetThemeSettings,
    generateUrl,
    isLoading,
    isSaving
  };
}
