import { useLocalStorage } from './useLocalStorage';

// Define the theme settings interface
export interface ThemeSettings {
  enabled: boolean;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  backgroundColor: string;
  accentColor: string;
  borderRadius: number;
  showQueue: boolean;
  maxQueueItems: number;
  showSpeakingIndicator: boolean;
  animation: string;
  customCSS: string;
}

// Default theme settings
export const defaultThemeSettings: ThemeSettings = {
  enabled: false,
  width: 800,
  height: 200,
  fontSize: 16,
  fontFamily: "Inter, sans-serif",
  textColor: "#ffffff",
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  accentColor: "#9146FF",
  borderRadius: 8,
  showQueue: true,
  maxQueueItems: 3,
  showSpeakingIndicator: true,
  animation: "fade",
  customCSS: ""
};

/**
 * A hook for managing theme settings that persist in localStorage
 * 
 * @param storageKey The localStorage key to store the settings under
 * @returns Theme settings state and functions to update it
 */
export function useThemeSettings(storageKey: string = 'obs-overlay-settings') {
  const [settings, setSettings] = useLocalStorage<ThemeSettings>(storageKey, defaultThemeSettings);
  
  // Generate URL for OBS Browser Source
  const generateUrl = (baseUrl: string = window.location.origin) => {
    return `${baseUrl}/obs?theme=${encodeURIComponent(JSON.stringify(settings))}`;
  };
  
  // Reset settings to defaults
  const resetToDefaults = () => {
    setSettings(defaultThemeSettings);
  };
  
  // Update a single setting
  const updateSetting = <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };
  
  return {
    settings,
    setSettings,
    generateUrl,
    resetToDefaults,
    updateSetting
  };
}
