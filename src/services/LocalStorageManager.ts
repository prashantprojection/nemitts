import { MessageFilterSettings, SpeechOptions, UserVoiceAssignment } from "./speech/types";

/**
 * LocalStorageManager handles saving and loading settings from localStorage
 * This provides a consistent interface for all settings storage
 */
export class LocalStorageManager {
  private static readonly KEYS = {
    VOICE_SETTINGS: 'voice-settings', // Simplified key for better compatibility
    FILTER_SETTINGS: 'filter-settings',
    USER_VOICE_ASSIGNMENTS: 'user-voice-assignments',
    THEME_SETTINGS: 'theme-settings',
    // STREAMDECK_SETTINGS removed
    OBS_SETTINGS: 'obs-settings',
    USER_REDEMPTIONS: 'user-redemptions',
    TWITCH_INTEGRATION_SETTINGS: 'twitch-integration-settings',
    LAST_UPDATED: 'settings-last-updated',
  };

  /**
   * Save voice settings to localStorage
   */
  public static saveVoiceSettings(settings: SpeechOptions): boolean {
    console.log("LocalStorageManager.saveVoiceSettings called with:", {
      voiceName: settings.voiceName,
      hasVoiceObject: !!settings.voice,
      rate: settings.rate,
      pitch: settings.pitch,
      volume: settings.volume
    });

    try {
      // Save the settings
      const dataToSave = {
        voiceName: settings.voiceName,
        rate: settings.rate || 1,
        pitch: settings.pitch || 1,
        volume: settings.volume || 1,
        randomizeVoice: settings.randomizeVoice,
        includedVoicesForRandomization: settings.includedVoicesForRandomization || [],
        excludedVoicesForRandomization: settings.excludedVoicesForRandomization || [],
        speakUsernames: settings.speakUsernames,
        externalTtsEnabled: settings.externalTtsEnabled,
        externalTtsApiKey: settings.externalTtsApiKey,
        externalTtsVoiceId: settings.externalTtsVoiceId,
        timestamp: new Date().getTime()
      };

      console.log("Saving to localStorage with key:", this.KEYS.VOICE_SETTINGS, "data:", dataToSave);
      localStorage.setItem(this.KEYS.VOICE_SETTINGS, JSON.stringify(dataToSave));

      // Update last updated timestamp
      this.updateLastUpdated();

      // Verify the save worked by reading it back
      const savedData = localStorage.getItem(this.KEYS.VOICE_SETTINGS);
      console.log("Verification - read back from localStorage:", savedData ? JSON.parse(savedData) : null);

      return true;
    } catch (error) {
      console.error('Error saving voice settings to localStorage:', error);
      return false;
    }
  }

  /**
   * Load voice settings from localStorage
   */
  public static loadVoiceSettings(): Partial<SpeechOptions> | null {
    console.log("LocalStorageManager.loadVoiceSettings called");
    try {
      const settings = localStorage.getItem(this.KEYS.VOICE_SETTINGS);
      console.log("Raw settings from localStorage:", settings);
      if (settings) {
        const parsedSettings = JSON.parse(settings);
        console.log("Parsed settings from localStorage:", parsedSettings);
        return parsedSettings;
      }
      console.log("No settings found in localStorage");
      return null;
    } catch (error) {
      console.error('Error loading voice settings from localStorage:', error);
      return null;
    }
  }

  /**
   * Save filter settings to localStorage
   */
  public static saveFilterSettings(settings: MessageFilterSettings): boolean {
    try {
      localStorage.setItem(this.KEYS.FILTER_SETTINGS, JSON.stringify({
        ...settings,
        timestamp: new Date().getTime()
      }));
      this.updateLastUpdated();
      return true;
    } catch (error) {
      console.error('Error saving filter settings to localStorage:', error);
      return false;
    }
  }

  /**
   * Load filter settings from localStorage
   */
  public static loadFilterSettings(): MessageFilterSettings | null {
    try {
      const settings = localStorage.getItem(this.KEYS.FILTER_SETTINGS);
      if (settings) {
        const parsedSettings = JSON.parse(settings);

        // Combine excludedUsernames and blacklistedUsers if both exist
        if (parsedSettings.excludedUsernames && parsedSettings.blacklistedUsers) {
          parsedSettings.excludedUsernames = [...new Set([
            ...parsedSettings.excludedUsernames,
            ...parsedSettings.blacklistedUsers
          ])];
        }

        return parsedSettings;
      }
      return null;
    } catch (error) {
      console.error('Error loading filter settings from localStorage:', error);
      return null;
    }
  }

  /**
   * Save user voice assignments to localStorage
   */
  public static saveUserVoiceAssignments(assignments: UserVoiceAssignment[]): boolean {
    try {
      localStorage.setItem(this.KEYS.USER_VOICE_ASSIGNMENTS, JSON.stringify({
        assignments,
        timestamp: new Date().getTime()
      }));
      this.updateLastUpdated();
      return true;
    } catch (error) {
      console.error('Error saving user voice assignments to localStorage:', error);
      return false;
    }
  }

  /**
   * Load user voice assignments from localStorage
   */
  public static loadUserVoiceAssignments(): UserVoiceAssignment[] | null {
    try {
      const data = localStorage.getItem(this.KEYS.USER_VOICE_ASSIGNMENTS);
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.assignments || [];
      }
      return null;
    } catch (error) {
      console.error('Error loading user voice assignments from localStorage:', error);
      return null;
    }
  }

  // StreamDeck settings methods removed

  /**
   * Save OBS settings to localStorage
   */
  public static saveObsSettings(settings: any): boolean {
    try {
      localStorage.setItem(this.KEYS.OBS_SETTINGS, JSON.stringify({
        ...settings,
        timestamp: new Date().getTime()
      }));
      this.updateLastUpdated();
      return true;
    } catch (error) {
      console.error('Error saving OBS settings to localStorage:', error);
      return false;
    }
  }

  /**
   * Load OBS settings from localStorage
   */
  public static loadObsSettings(): any {
    try {
      const settings = localStorage.getItem(this.KEYS.OBS_SETTINGS);
      if (settings) {
        return JSON.parse(settings);
      }
      return null;
    } catch (error) {
      console.error('Error loading OBS settings from localStorage:', error);
      return null;
    }
  }

  /**
   * Update the last updated timestamp
   * This is used to track when settings were last changed
   */
  private static updateLastUpdated(): void {
    try {
      localStorage.setItem(this.KEYS.LAST_UPDATED, new Date().getTime().toString());
    } catch (error) {
      console.error('Error updating last updated timestamp:', error);
    }
  }

  /**
   * Get the last updated timestamp
   */
  public static getLastUpdated(): number {
    try {
      const timestamp = localStorage.getItem(this.KEYS.LAST_UPDATED);
      if (timestamp) {
        return parseInt(timestamp, 10);
      }
      return 0;
    } catch (error) {
      console.error('Error getting last updated timestamp:', error);
      return 0;
    }
  }

  /**
   * Save user redemptions to localStorage
   */
  public static saveUserRedemptions(redemptions: any[]): boolean {
    try {
      localStorage.setItem(this.KEYS.USER_REDEMPTIONS, JSON.stringify({
        redemptions
      }));
      this.updateLastUpdated();
      return true;
    } catch (error) {
      console.error('Error saving user redemptions to localStorage:', error);
      return false;
    }
  }

  /**
   * Load user redemptions from localStorage
   */
  public static loadUserRedemptions(): any[] | null {
    try {
      const data = localStorage.getItem(this.KEYS.USER_REDEMPTIONS);
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.redemptions || [];
      }
      return null;
    } catch (error) {
      console.error('Error loading user redemptions from localStorage:', error);
      return null;
    }
  }

  /**
   * Save Twitch integration settings to localStorage
   */
  public static saveTwitchIntegrationSettings(settings: any): boolean {
    try {
      localStorage.setItem(this.KEYS.TWITCH_INTEGRATION_SETTINGS, JSON.stringify(settings));
      this.updateLastUpdated();
      return true;
    } catch (error) {
      console.error('Error saving Twitch integration settings to localStorage:', error);
      return false;
    }
  }

  /**
   * Load Twitch integration settings from localStorage
   */
  public static loadTwitchIntegrationSettings(): any | null {
    try {
      const settings = localStorage.getItem(this.KEYS.TWITCH_INTEGRATION_SETTINGS);
      if (settings) {
        return JSON.parse(settings);
      }
      return null;
    } catch (error) {
      console.error('Error loading Twitch integration settings from localStorage:', error);
      return null;
    }
  }

  /**
   * Clear all settings from localStorage
   */
  public static clearAllSettings(): boolean {
    try {
      // Clear our current keys
      localStorage.removeItem(this.KEYS.VOICE_SETTINGS);
      localStorage.removeItem(this.KEYS.FILTER_SETTINGS);
      localStorage.removeItem(this.KEYS.USER_VOICE_ASSIGNMENTS);
      localStorage.removeItem(this.KEYS.THEME_SETTINGS);
      // StreamDeck settings removed
      localStorage.removeItem(this.KEYS.OBS_SETTINGS);
      localStorage.removeItem(this.KEYS.USER_REDEMPTIONS);
      localStorage.removeItem(this.KEYS.TWITCH_INTEGRATION_SETTINGS);
      localStorage.removeItem(this.KEYS.LAST_UPDATED);

      // Also clear legacy keys that might be causing issues
      localStorage.removeItem('twitch-tts-voice-settings');
      localStorage.removeItem('twitch-tts-filter-settings');
      localStorage.removeItem('twitch-tts-user-voice-assignments');
      localStorage.removeItem('twitch-tts-theme-settings');
      // StreamDeck legacy settings removed
      localStorage.removeItem('twitch-tts-obs-settings');
      localStorage.removeItem('twitch-tts-settings-last-updated');

      console.log('All settings cleared from localStorage');
      return true;
    } catch (error) {
      console.error('Error clearing all settings from localStorage:', error);
      return false;
    }
  }
}

export default LocalStorageManager;
