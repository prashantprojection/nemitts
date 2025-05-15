// Supabase import removed - using localStorage instead
import { debounce } from '@/utils/debounce';
import LocalStorageManager from './LocalStorageManager';

// Define settings types
export interface BaseSettings {
  id?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ThemeSettings extends BaseSettings {
  name: string;
  settings: {
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
  };
}

export interface VoiceSettings extends BaseSettings {
  voiceName: string;
  rate: number;
  pitch: number;
  volume: number;
  randomizeVoice?: boolean;
  includedVoicesForRandomization?: string[];
  excludedVoicesForRandomization?: string[];
}

export interface FilterSettings extends BaseSettings {
  enabled: boolean;
  minMessageLength: number;
  maxMessageLength: number;
  userCooldown: number;
  speakUsernames: boolean;
  useNicknames?: boolean;
  userNicknames?: {
    username: string;
    nickname: string;
  }[];
  skipEmojisInMessage: boolean;
  skipLinksInMessage: boolean;
  skipBotMessages: boolean;
  specificUsersOnly: boolean;
  specificUsersList: string[];
  blacklistedUsers: string[];
  priorityUsers: string[];
  blacklistedWords: string[];
  // regexFilters removed
  wordReplacements?: {
    pattern: string;
    replacement: string;
    caseSensitive: boolean;
    wholeWord: boolean;
  }[];
}

// BubbleSettings interface removed

// Settings service class
class SettingsService {
  private initialized = false;
  private userId: string | null = null;
  private listeners: Map<string, Set<(settings: any) => void>> = new Map();

  // Cache for settings
  private settingsCache: Map<string, any> = new Map();

  // Initialize the service with user ID
  async initialize(userId: string | null) {
    this.userId = userId;
    this.initialized = true;

    // Load all settings for this user
    if (userId) {
      await this.loadAllSettings();
    }

    // Bubble settings initialization removed

    return this;
  }

  // Load all settings for the current user
  private async loadAllSettings() {
    if (!this.userId) return;

    try {
      // Load voice settings from localStorage
      const voiceSettings = LocalStorageManager.loadVoiceSettings();
      if (voiceSettings) {
        this.settingsCache.set('voice_settings', voiceSettings);
        this.notifyListeners('voice_settings', voiceSettings);
      }

      // Load filter settings from localStorage
      const filterSettings = LocalStorageManager.loadFilterSettings();
      if (filterSettings) {
        this.settingsCache.set('filter_settings', filterSettings);
        this.notifyListeners('filter_settings', filterSettings);
      }

      // Load theme settings from localStorage
      const themeSettingsStr = localStorage.getItem('theme_settings');
      if (themeSettingsStr) {
        const themeSettings = JSON.parse(themeSettingsStr);
        this.settingsCache.set('theme_settings', themeSettings);
        this.notifyListeners('theme_settings', themeSettings);
      }

      // Load OBS settings from localStorage
      const obsSettings = LocalStorageManager.loadObsSettings();
      if (obsSettings) {
        this.settingsCache.set('obs_settings', obsSettings);
        this.notifyListeners('obs_settings', obsSettings);
      }
    } catch (error) {
      console.error('Error loading settings from localStorage:', error);
    }
  }

  // Get settings from cache or LocalStorageManager
  async getSettings<T extends BaseSettings>(settingsType: string, defaultSettings: T): Promise<T> {
    // First check cache for fastest access
    if (this.settingsCache.has(settingsType)) {
      return this.settingsCache.get(settingsType);
    }

    // Then check LocalStorageManager for fast access even when offline
    try {
      let localSettings = null;

      // Use the appropriate LocalStorageManager method based on settings type
      if (settingsType === 'voice_settings') {
        localSettings = LocalStorageManager.loadVoiceSettings();
      } else if (settingsType === 'filter_settings') {
        localSettings = LocalStorageManager.loadFilterSettings();
      } else if (settingsType === 'theme_settings') {
        // For other settings types, fall back to generic localStorage
        const storedSettings = localStorage.getItem(settingsType);
        if (storedSettings) {
          localSettings = JSON.parse(storedSettings);
        }
      }

      if (localSettings) {
        // Add to cache
        this.settingsCache.set(settingsType, localSettings);

        // If user is logged in, still fetch from Supabase in the background
        // to ensure we have the latest settings, but return local settings immediately
        if (this.userId) {
          this.fetchSettingsFromStorage(settingsType).then(supabaseSettings => {
            if (supabaseSettings) {
              // If the Supabase settings are newer, update the cache and localStorage
              const localUpdatedAt = new Date(localSettings.timestamp || localSettings.updated_at || 0);
              const supabaseUpdatedAt = new Date(supabaseSettings.updated_at || 0);

              if (supabaseUpdatedAt > localUpdatedAt) {
                this.settingsCache.set(settingsType, supabaseSettings);

                // Save to the appropriate storage based on settings type
                if (settingsType === 'voice_settings') {
                  LocalStorageManager.saveVoiceSettings(supabaseSettings);
                } else if (settingsType === 'filter_settings') {
                  LocalStorageManager.saveFilterSettings(supabaseSettings);
                } else {
                  localStorage.setItem(settingsType, JSON.stringify(supabaseSettings));
                }

                this.notifyListeners(settingsType, supabaseSettings);
              }
            }
          }).catch(error => {
            console.error(`Error fetching ${settingsType} from Supabase:`, error);
          });
        }

        return localSettings as T;
      }
    } catch (error) {
      console.error(`Error loading ${settingsType} from LocalStorageManager:`, error);
    }

    // If not in localStorage and user is logged in, try to load from storage
    if (this.userId) {
      try {
        const supabaseSettings = await this.fetchSettingsFromStorage(settingsType);
        if (supabaseSettings) {
          // Save to cache and localStorage for future fast access
          this.settingsCache.set(settingsType, supabaseSettings);
          localStorage.setItem(settingsType, JSON.stringify(supabaseSettings));
          return supabaseSettings;
        }
      } catch (error) {
        console.error(`Error fetching ${settingsType} from Supabase:`, error);
      }
    }

    // If we get here, use default settings and save them
    const settingsWithDefaults = {
      ...defaultSettings,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Save default settings to localStorage
    try {
      localStorage.setItem(settingsType, JSON.stringify(settingsWithDefaults));
      this.settingsCache.set(settingsType, settingsWithDefaults);
    } catch (error) {
      console.error(`Error saving default ${settingsType} to localStorage:`, error);
    }

    return settingsWithDefaults;
  }

  // Fetch settings from localStorage (replaces Supabase)
  private async fetchSettingsFromStorage<T extends BaseSettings>(settingsType: string): Promise<T | null> {
    if (!this.userId) return null;

    try {
      // Use the appropriate LocalStorageManager method based on settings type
      if (settingsType === 'voice_settings') {
        return LocalStorageManager.loadVoiceSettings() as T;
      } else if (settingsType === 'filter_settings') {
        return LocalStorageManager.loadFilterSettings() as T;
      } else if (settingsType === 'obs_settings') {
        return LocalStorageManager.loadObsSettings() as T;
      } else {
        // For other settings types, fall back to generic localStorage
        const storedSettings = localStorage.getItem(settingsType);
        if (storedSettings) {
          return JSON.parse(storedSettings) as T;
        }
      }
      return null;
    } catch (error) {
      console.error(`Error fetching ${settingsType} from localStorage:`, error);
      return null;
    }
  }

  // Save settings to LocalStorageManager
  async saveSettings<T extends BaseSettings>(settingsType: string, settings: T): Promise<boolean> {
    // Update timestamps
    const now = new Date().toISOString();
    const settingsWithTimestamps = {
      ...settings,
      updated_at: now,
      timestamp: new Date().getTime() // Add timestamp for easier comparison
    };

    if (!settingsWithTimestamps.created_at) {
      settingsWithTimestamps.created_at = now;
    }

    // Always save to LocalStorageManager first for immediate access
    let saveSuccess = false;
    try {
      // Save to the appropriate storage based on settings type
      if (settingsType === 'voice_settings') {
        saveSuccess = LocalStorageManager.saveVoiceSettings(settingsWithTimestamps);
      } else if (settingsType === 'filter_settings') {
        saveSuccess = LocalStorageManager.saveFilterSettings(settingsWithTimestamps);
      } else {
        // For other settings types, fall back to generic localStorage
        localStorage.setItem(settingsType, JSON.stringify(settingsWithTimestamps));
        saveSuccess = true;
      }

      // Update cache and notify listeners
      this.settingsCache.set(settingsType, settingsWithTimestamps);
      this.notifyListeners(settingsType, settingsWithTimestamps);

      // Log success
      if (process.env.NODE_ENV === 'development') {
        console.log(`Saved ${settingsType} to storage successfully`);
      }
    } catch (error) {
      console.error(`Error saving ${settingsType} to storage:`, error);
      return false;
    }

    if (!saveSuccess) {
      return false;
    }

    // Then save to localStorage in the background if user is logged in
    if (this.userId) {
      // Don't await this - let it happen in the background
      this.saveToStorage(settingsType, settingsWithTimestamps).catch(error => {
        console.error(`Error saving ${settingsType} to localStorage:`, error);
      });
    }

    // Return true immediately after saving to localStorage
    return true;
  }

  // Save settings to localStorage (replaces Supabase)
  private async saveToStorage<T extends BaseSettings>(settingsType: string, settings: T): Promise<boolean> {
    if (!this.userId) return false;

    try {
      const settingsWithUser = {
        ...settings,
        user_id: this.userId
      };

      // Generate an ID if not present
      if (!settingsWithUser.id) {
        settingsWithUser.id = Date.now().toString(36) + Math.random().toString(36).substring(2);
      }

      // Update the cache
      this.settingsCache.set(settingsType, settingsWithUser);

      // Save to the appropriate storage based on settings type
      if (settingsType === 'voice_settings') {
        return LocalStorageManager.saveVoiceSettings(settingsWithUser);
      } else if (settingsType === 'filter_settings') {
        return LocalStorageManager.saveFilterSettings(settingsWithUser);
      } else if (settingsType === 'obs_settings') {
        return LocalStorageManager.saveObsSettings(settingsWithUser);
      } else {
        // For other settings types, fall back to generic localStorage
        localStorage.setItem(settingsType, JSON.stringify(settingsWithUser));
        return true;
      }
    } catch (error) {
      console.error(`Error saving ${settingsType} to localStorage:`, error);
      return false;
    }
  }

  // Debounced version of saveSettings to prevent excessive writes
  debouncedSaveSettings = debounce(this.saveSettings.bind(this), 500);

  // Add a listener for settings changes
  addListener(settingsType: string, listener: (settings: any) => void) {
    if (!this.listeners.has(settingsType)) {
      this.listeners.set(settingsType, new Set());
    }

    this.listeners.get(settingsType)?.add(listener);

    // If we have cached settings, notify the listener immediately
    if (this.settingsCache.has(settingsType)) {
      listener(this.settingsCache.get(settingsType));
    }
  }

  // Remove a listener
  removeListener(settingsType: string, listener?: (settings: any) => void) {
    if (listener) {
      // Remove specific listener
      this.listeners.get(settingsType)?.delete(listener);
    } else {
      // Remove all listeners for this settings type
      this.listeners.delete(settingsType);
    }
  }

  // Notify all listeners of a settings change
  private notifyListeners(settingsType: string, settings: any) {
    this.listeners.get(settingsType)?.forEach(listener => {
      listener(settings);
    });
  }
}

// Create and export a singleton instance
const settingsService = new SettingsService();
export default settingsService;
