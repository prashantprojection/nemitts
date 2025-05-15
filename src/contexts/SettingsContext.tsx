import * as React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
// Toast functionality removed
import settingsService, { ThemeSettings, VoiceSettings, FilterSettings } from '@/services/SettingsService';
import { supabase } from '@/integrations/supabase/client';
import speechService from '@/services/SpeechService';
import { MessageFilterSettings } from '@/services/speech/types';
import { debounce } from '@/utils/debounce';

// Default settings
export const defaultThemeSettings: ThemeSettings['settings'] = {
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

export const defaultVoiceSettings: VoiceSettings = {
  voiceName: "",
  rate: 1,
  pitch: 1,
  volume: 1,
  randomizeVoice: false,
  includedVoicesForRandomization: [],
  excludedVoicesForRandomization: []
};

export const defaultFilterSettings: FilterSettings = {
  enabled: true,
  minMessageLength: 0,
  maxMessageLength: 500,
  userCooldown: 0,
  speakUsernames: true,
  useNicknames: false,
  userNicknames: [],
  skipEmojisInMessage: true,
  skipLinksInMessage: true,
  skipBotMessages: true,
  specificUsersOnly: false,
  specificUsersList: [],
  priorityUsers: [],
  blacklistedUsers: [],
  blacklistedWords: [],
  // regexFilters removed
  wordReplacements: []
};

// Preset functionality removed

// Context type
interface SettingsContextType {
  // Theme settings
  themeSettings: ThemeSettings['settings'];
  updateThemeSetting: <K extends keyof ThemeSettings['settings']>(key: K, value: ThemeSettings['settings'][K]) => void;
  saveThemeSettings: () => Promise<boolean>;
  resetThemeSettings: () => void;

  // Voice settings
  voiceSettings: VoiceSettings;
  updateVoiceSetting: <K extends keyof VoiceSettings>(key: K, value: VoiceSettings[K]) => void;
  saveVoiceSettings: () => Promise<boolean>;
  resetVoiceSettings: () => void;

  // Filter settings
  filterSettings: FilterSettings;
  updateFilterSetting: <K extends keyof FilterSettings>(key: K, value: FilterSettings[K]) => void;
  saveFilterSettings: () => Promise<boolean>;
  resetFilterSettings: () => void;

  // Reset all settings
  resetAllSettings: () => Promise<void>;

  // Loading states
  isLoading: boolean;
  isSaving: boolean;
}

// Create context
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Provider component
export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State for settings
  const [themeSettings, setThemeSettings] = useState<ThemeSettings['settings']>(defaultThemeSettings);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(defaultVoiceSettings);
  const [filterSettings, setFilterSettings] = useState<FilterSettings>(defaultFilterSettings);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize settings service with user ID
  useEffect(() => {
    const initializeSettings = async () => {
      setIsLoading(true);

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || null;

        // Initialize settings service
        await settingsService.initialize(userId);

        // Load settings from service - use Promise.all for parallel loading
        const [
          storedThemeSettings,
          storedVoiceSettings,
          storedFilterSettings
        ] = await Promise.all([
          // Theme settings
          settingsService.getSettings<ThemeSettings>(
            'theme_settings',
            { name: 'Default', settings: defaultThemeSettings }
          ),

          // Voice settings
          settingsService.getSettings<VoiceSettings>(
            'voice_settings',
            defaultVoiceSettings
          ),

          // Filter settings
          settingsService.getSettings<FilterSettings>(
            'filter_settings',
            defaultFilterSettings
          )
        ]);

        // Update state with loaded settings
        setThemeSettings(storedThemeSettings.settings || defaultThemeSettings);
        setVoiceSettings(storedVoiceSettings);
        setFilterSettings(storedFilterSettings);

        // Also update the speech service with the loaded filter settings
        // Use setOptions instead of saveSettings to avoid triggering the "settings saved" notification
        try {
          const options = await speechService.getOptions();
          speechService.setOptions({
            ...options,
            filterSettings: convertToMessageFilterSettings(storedFilterSettings)
          });
        } catch (speechError) {
          console.error('Error updating speech service with loaded filter settings:', speechError);
        }

        // Set up listeners for settings changes
        settingsService.addListener('theme_settings', (settings: ThemeSettings) => {
          setThemeSettings(settings.settings || defaultThemeSettings);
        });

        settingsService.addListener('voice_settings', (settings: VoiceSettings) => {
          setVoiceSettings(settings);
        });

        settingsService.addListener('filter_settings', (settings: FilterSettings) => {
          setFilterSettings(settings);
        });
      } catch (error) {
        console.error('Error initializing settings:', error);
        // Show notification in status bar instead of toast
        window.dispatchEvent(new CustomEvent('status-notification', {
          detail: {
            type: 'error',
            message: 'Failed to load settings'
          }
        }));

        // Fall back to default settings
        setThemeSettings(defaultThemeSettings);
        setVoiceSettings(defaultVoiceSettings);
        setFilterSettings(defaultFilterSettings);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSettings();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      // Reinitialize settings when auth state changes
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        initializeSettings();
      }
    });

    // Clean up subscription and listeners
    return () => {
      subscription.unsubscribe();
      settingsService.removeListener('theme_settings');
      settingsService.removeListener('voice_settings');
      settingsService.removeListener('filter_settings');
    };
  }, []);

  // Update theme settings
  const updateThemeSetting = <K extends keyof ThemeSettings['settings']>(
    key: K,
    value: ThemeSettings['settings'][K]
  ) => {
    setThemeSettings(prev => {
      const updated = { ...prev, [key]: value };
      // Debounced save
      settingsService.debouncedSaveSettings('theme_settings', {
        name: 'Default',
        settings: updated
      });
      return updated;
    });
  };

  // Save theme settings
  const saveThemeSettings = async () => {
    setIsSaving(true);
    try {
      const success = await settingsService.saveSettings('theme_settings', {
        name: 'Default',
        settings: themeSettings
      });

      if (success) {
        toast.success('Theme settings saved');
      } else {
        toast.error('Failed to save theme settings');
      }

      return success;
    } catch (error) {
      console.error('Error saving theme settings:', error);
      toast.error('Failed to save theme settings');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Reset theme settings
  const resetThemeSettings = async () => {
    // First update the local state
    setThemeSettings(defaultThemeSettings);

    // Save the default settings to persist them
    await settingsService.saveSettings('theme_settings', {
      name: 'Default',
      settings: defaultThemeSettings
    });

    // Create a default preset with the current settings
    // Use the updated settings directly rather than from state
    const currentSettings = {
      ...getCurrentSettingsAsPreset(),
      themeSettings: defaultThemeSettings
    };

    // Dispatch a custom event to notify other components
    window.dispatchEvent(new CustomEvent('settings-reset', {
      detail: { type: 'theme', settings: currentSettings }
    }));

    toast.info('Theme settings reset to defaults');
  };

  // Update voice settings
  const updateVoiceSetting = <K extends keyof VoiceSettings>(
    key: K,
    value: VoiceSettings[K]
  ) => {
    setVoiceSettings(prev => {
      const updated = { ...prev, [key]: value };
      // Debounced save
      settingsService.debouncedSaveSettings('voice_settings', updated);
      return updated;
    });
  };

  // Save voice settings
  const saveVoiceSettings = async () => {
    setIsSaving(true);
    try {
      const success = await settingsService.saveSettings('voice_settings', voiceSettings);

      if (success) {
        toast.success('Voice settings saved');
      } else {
        toast.error('Failed to save voice settings');
      }

      return success;
    } catch (error) {
      console.error('Error saving voice settings:', error);
      toast.error('Failed to save voice settings');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Reset voice settings
  const resetVoiceSettings = async () => {
    // First update the local state
    setVoiceSettings(defaultVoiceSettings);

    // Save the default settings to persist them
    await settingsService.saveSettings('voice_settings', defaultVoiceSettings);

    // Also update the speech service
    try {
      await speechService.saveSettings({
        voiceName: defaultVoiceSettings.voiceName,
        rate: defaultVoiceSettings.rate,
        pitch: defaultVoiceSettings.pitch,
        volume: defaultVoiceSettings.volume
      });
    } catch (speechError) {
      console.error('Error updating speech service with default voice settings:', speechError);
    }

    // Create a default preset with the current settings
    // Use the updated settings directly rather than from state
    const currentSettings = {
      ...getCurrentSettingsAsPreset(),
      voiceSettings: defaultVoiceSettings
    };

    // Dispatch a custom event to notify other components
    window.dispatchEvent(new CustomEvent('settings-reset', {
      detail: { type: 'voice', settings: currentSettings }
    }));

    toast.info('Voice settings reset to defaults');
  };

  // Convert FilterSettings to MessageFilterSettings for the speech system
  const convertToMessageFilterSettings = (settings: FilterSettings): MessageFilterSettings => {
    // Make sure blacklistedWords is properly initialized and filtered
    const filteredBlacklistedWords = Array.isArray(settings.blacklistedWords)
      ? settings.blacklistedWords.filter(word => word && word.trim() !== '')
      : [];

    console.log('Converting filter settings, blacklisted words:', filteredBlacklistedWords);

    // Make sure blacklistedUsers is properly initialized and filtered
    const filteredBlacklistedUsers = Array.isArray(settings.blacklistedUsers)
      ? settings.blacklistedUsers.filter(user => user && user.trim() !== '')
      : [];

    return {
      enabled: settings.enabled,
      keywordBlacklist: filteredBlacklistedWords,
      userBlacklist: filteredBlacklistedUsers,
      speakUsernames: settings.speakUsernames,
      useNicknames: settings.useNicknames || false,
      userNicknames: Array.isArray(settings.userNicknames) ? settings.userNicknames : [],
      skipEmojisInMessage: settings.skipEmojisInMessage,
      skipLinksInMessage: settings.skipLinksInMessage,
      skipBotMessages: settings.skipBotMessages,
      specificUsersOnly: settings.specificUsersOnly,
      specificUsersList: Array.isArray(settings.specificUsersList) ? settings.specificUsersList : [],
      // regexFilters removed
      wordReplacements: Array.isArray(settings.wordReplacements) ? settings.wordReplacements : [],
      minMessageLength: settings.minMessageLength,
      maxMessageLength: settings.maxMessageLength,
      userCooldown: settings.userCooldown,
      priorityUsers: Array.isArray(settings.priorityUsers) ? settings.priorityUsers : []
    };
  };

  // Update filter settings
  const updateFilterSetting = <K extends keyof FilterSettings>(
    key: K,
    value: FilterSettings[K]
  ) => {
    setFilterSettings(prev => {
      const updated = { ...prev, [key]: value };

      // Debounced save to settings service
      settingsService.debouncedSaveSettings('filter_settings', updated);

      // Also update the speech service with the converted settings immediately
      // This ensures the filter settings are applied right away
      console.log('SettingsContext: Updating filter setting', key, value);
      try {
        const convertedSettings = convertToMessageFilterSettings(updated);
        console.log('SettingsContext: Converted filter settings', convertedSettings);
        speechService.setOptions({
          filterSettings: convertedSettings
        });
      } catch (error) {
        console.error('Error updating speech service with filter settings:', error);
      }

      return updated;
    });
  };

  // Save filter settings
  const saveFilterSettings = async () => {
    setIsSaving(true);
    try {
      // Save to settings service for persistence
      const success = await settingsService.saveSettings('filter_settings', filterSettings);

      // Also update the speech service with the converted settings
      try {
        const options = await speechService.getOptions();
        await speechService.saveSettings({
          ...options,
          filterSettings: convertToMessageFilterSettings(filterSettings)
        });
      } catch (speechError) {
        console.error('Error updating speech service with filter settings:', speechError);
      }

      if (success) {
        toast.success('Filter settings saved');
      } else {
        toast.error('Failed to save filter settings');
      }

      return success;
    } catch (error) {
      console.error('Error saving filter settings:', error);
      toast.error('Failed to save filter settings');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Reset filter settings
  const resetFilterSettings = async () => {
    // First update the local state
    setFilterSettings(defaultFilterSettings);

    // Also update the speech service with the default settings
    // Use setOptions instead of saveSettings to avoid triggering the "settings saved" notification
    try {
      const options = await speechService.getOptions();
      speechService.setOptions({
        ...options,
        filterSettings: convertToMessageFilterSettings(defaultFilterSettings)
      });

      // Now explicitly save the settings to persist them
      await settingsService.saveSettings('filter_settings', defaultFilterSettings);
    } catch (speechError) {
      console.error('Error updating speech service with default filter settings:', speechError);
    }

    // Create a default preset with the current settings
    // Use the updated settings directly rather than from state
    const currentSettings = {
      ...getCurrentSettingsAsPreset(),
      filterSettings: defaultFilterSettings
    };

    // Dispatch a custom event to notify other components
    window.dispatchEvent(new CustomEvent('settings-reset', {
      detail: { type: 'filter', settings: currentSettings }
    }));

    toast.info('Filter settings reset to defaults');
  };

  // Create a single debounced save function for bubble settings
  const debouncedSaveBubbleSettings = React.useCallback(
    (settings: ChatBubbleSettings) => {
      // Use a simple setTimeout instead of the debounce utility
      const timeoutId = setTimeout(() => {
        settingsService.saveSettings('bubble_settings', {
          settings
        });
      }, 1000);

      // Return a cleanup function to clear the timeout
      return () => clearTimeout(timeoutId);
    },
    []
  );

  // Store the timeout ID for bubble settings
  const bubbleSettingsTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Update bubble settings
  const updateBubbleSetting = <K extends keyof ChatBubbleSettings>(
    key: K,
    value: ChatBubbleSettings[K]
  ) => {
    setBubbleSettings(prev => {
      // Only update if the value has actually changed
      if (prev[key] === value) {
        return prev; // No change, return the same object
      }

      const updated = { ...prev, [key]: value };

      // Clear any existing timeout
      if (bubbleSettingsTimeoutRef.current) {
        clearTimeout(bubbleSettingsTimeoutRef.current);
      }

      // Set a new timeout
      bubbleSettingsTimeoutRef.current = setTimeout(() => {
        settingsService.saveSettings('bubble_settings', {
          settings: updated
        });
        bubbleSettingsTimeoutRef.current = null;
      }, 1000);

      return updated;
    });
  };

  // Save bubble settings
  const saveBubbleSettings = async () => {
    setIsSaving(true);
    try {
      const success = await settingsService.saveSettings('bubble_settings', {
        settings: bubbleSettings
      });

      if (success) {
        toast.success('Chat bubble settings saved');
      } else {
        toast.error('Failed to save chat bubble settings');
      }

      return success;
    } catch (error) {
      console.error('Error saving chat bubble settings:', error);
      toast.error('Failed to save chat bubble settings');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Reset bubble settings
  const resetBubbleSettings = async () => {
    // First update the local state
    setBubbleSettings(DEFAULT_CHAT_BUBBLE_SETTINGS);

    // Save the default settings to persist them
    await settingsService.saveSettings('bubble_settings', {
      settings: DEFAULT_CHAT_BUBBLE_SETTINGS
    });

    // Create a default preset with the current settings
    // Use the updated settings directly rather than from state
    const currentSettings = {
      ...getCurrentSettingsAsPreset(),
      bubbleSettings: DEFAULT_CHAT_BUBBLE_SETTINGS
    };

    // Dispatch a custom event to notify other components
    window.dispatchEvent(new CustomEvent('settings-reset', {
      detail: { type: 'bubble', settings: currentSettings }
    }));

    toast.info('Chat bubble settings reset to defaults');
  };

  // Reset all settings to defaults
  const resetAllSettings = async () => {
    setIsSaving(true);
    try {
      // Reset all settings
      setThemeSettings(defaultThemeSettings);
      setVoiceSettings(defaultVoiceSettings);
      setFilterSettings(defaultFilterSettings);
      setBubbleSettings(DEFAULT_CHAT_BUBBLE_SETTINGS);

      // Save all default settings to persist them
      await Promise.all([
        settingsService.saveSettings('theme_settings', {
          name: 'Default',
          settings: defaultThemeSettings
        }),
        settingsService.saveSettings('voice_settings', defaultVoiceSettings),
        settingsService.saveSettings('filter_settings', defaultFilterSettings),
        settingsService.saveSettings('bubble_settings', {
          settings: DEFAULT_CHAT_BUBBLE_SETTINGS
        })
      ]);

      // Also update the speech service
      try {
        const options = await speechService.getOptions();
        await speechService.saveSettings({
          voiceName: defaultVoiceSettings.voiceName,
          rate: defaultVoiceSettings.rate,
          pitch: defaultVoiceSettings.pitch,
          volume: defaultVoiceSettings.volume,
          filterSettings: convertToMessageFilterSettings(defaultFilterSettings)
        });
      } catch (speechError) {
        console.error('Error updating speech service with default settings:', speechError);
      }

      // Dispatch a custom event to notify other components
      window.dispatchEvent(new CustomEvent('settings-reset', {
        detail: { type: 'all' }
      }));

      // Show notification in status bar instead of toast
      window.dispatchEvent(new CustomEvent('status-notification', {
        detail: {
          type: 'success',
          message: 'All settings reset to defaults'
        }
      }));
    } catch (error) {
      console.error('Error resetting all settings:', error);
      // Show notification in status bar instead of toast
      window.dispatchEvent(new CustomEvent('status-notification', {
        detail: {
          type: 'error',
          message: 'Failed to reset all settings'
        }
      }));
    } finally {
      setIsSaving(false);
    }
  };

  // Preset functionality removed

  // Context value
  const value: SettingsContextType = {
    themeSettings,
    updateThemeSetting,
    saveThemeSettings,
    resetThemeSettings,

    voiceSettings,
    updateVoiceSetting,
    saveVoiceSettings,
    resetVoiceSettings,

    filterSettings,
    updateFilterSetting,
    saveFilterSettings,
    resetFilterSettings,

    // Reset all settings
    resetAllSettings,

    isLoading,
    isSaving
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

// Hook for using the settings context
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
