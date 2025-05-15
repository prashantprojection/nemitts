
import { supabase } from "@/integrations/supabase/client";
// Toast functionality removed
import { MessageFilterSettings, SpeechOptions, UserVoiceAssignment, defaultFilterSettings } from "./types";
import voiceManager from "./voiceManager";
import LocalStorageManager from "@/services/LocalStorageManager";

export class SettingsManager {
  public async loadSettings(): Promise<SpeechOptions | null> {
    // First try to load from localStorage for fastest access
    try {
      const localSettings = LocalStorageManager.loadVoiceSettings();
      const localFilterSettings = LocalStorageManager.loadFilterSettings();
      const localUserVoiceAssignments = LocalStorageManager.loadUserVoiceAssignments();

      if (localSettings) {
        // Find the voice by name if it exists
        const voice = voiceManager.getVoiceByName(localSettings.voiceName as string);

        const options: SpeechOptions = {
          voice,
          voiceName: localSettings.voiceName as string,
          rate: localSettings.rate || 1,
          pitch: localSettings.pitch || 1,
          volume: localSettings.volume || 1,
          speakUsernames: localSettings.speakUsernames ?? true,
          filterSettings: localFilterSettings || { ...defaultFilterSettings },
          userVoiceAssignments: localUserVoiceAssignments || [],
          externalTtsEnabled: localSettings.externalTtsEnabled ?? false,
          externalTtsApiKey: localSettings.externalTtsApiKey,
          externalTtsVoiceId: localSettings.externalTtsVoiceId
        };

        // Only log in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log("Loaded TTS settings from localStorage:", options);
        }

        // If user is logged in, also try to load from Supabase in the background
        // to ensure we have the latest settings
        this.loadFromSupabaseAndSync();

        return options;
      }
    } catch (err) {
      console.error("Error loading speech settings from localStorage:", err);
    }

    // If not in localStorage, try to load from Supabase
    return this.loadFromSupabase();
  }

  /**
   * Load settings from Supabase
   */
  private async loadFromSupabase(): Promise<SpeechOptions | null> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', session.session.user.id)
          .single();

        if (data && !error) {
          // Find the voice by name if it exists
          const voice = voiceManager.getVoiceByName(data.tts_voice);

          // Load filter settings if they exist
          let filterSettings: MessageFilterSettings = { ...defaultFilterSettings };
          let userVoiceAssignments: UserVoiceAssignment[] = [];

          try {
            // Try to load filter settings from JSON field if it exists
            if (data.filter_settings) {
              const parsedFilters = typeof data.filter_settings === 'string'
                ? JSON.parse(data.filter_settings)
                : data.filter_settings;

              filterSettings = {
                ...defaultFilterSettings,
                ...parsedFilters
              };
            }

            // Try to load user voice assignments from JSON field if it exists
            if (data.user_voice_assignments) {
              const parsedAssignments = typeof data.user_voice_assignments === 'string'
                ? JSON.parse(data.user_voice_assignments)
                : data.user_voice_assignments;

              userVoiceAssignments = Array.isArray(parsedAssignments) ? parsedAssignments : [];
            }
          } catch (error) {
            console.error('Error parsing saved filter settings:', error);
          }

          const options: SpeechOptions = {
            voice,
            voiceName: data.tts_voice,
            rate: data.tts_rate,
            pitch: data.tts_pitch,
            volume: data.tts_volume,
            speakUsernames: data.speak_usernames ?? true,
            filterSettings,
            userVoiceAssignments,
            externalTtsEnabled: data.external_tts_enabled ?? false,
            externalTtsApiKey: data.external_tts_api_key,
            externalTtsVoiceId: data.external_tts_voice_id
          };

          // Don't save to localStorage here to avoid triggering the "settings saved" notification
          // We'll just return the options and let the caller decide whether to save them
          // This prevents showing the save notification when just loading settings

          // Only log in development mode
          if (process.env.NODE_ENV === 'development') {
            console.log("Loaded TTS settings from Supabase:", options);
          }
          return options;
        }
      }
    } catch (err) {
      console.error("Error loading speech settings from Supabase:", err);
    }

    return null;
  }

  /**
   * Load settings from Supabase and sync with localStorage if newer
   * This is called in the background to ensure we have the latest settings
   */
  private async loadFromSupabaseAndSync(): Promise<void> {
    try {
      // Just check if Supabase has settings, but don't trigger any save operations
      // This prevents the "settings saved" notification on app load
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return;

      const { data } = await supabase
        .from('user_settings')
        .select('updated_at')
        .eq('user_id', session.session.user.id)
        .single();

      // If we have data in Supabase, we'll sync it later when needed
      if (data) {
        console.log("Found settings in Supabase, will sync if needed");
      }
    } catch (err) {
      console.error("Error checking settings with Supabase:", err);
    }
  }

  public async saveSettings(options: SpeechOptions): Promise<boolean> {
    console.log("settingsManager.saveSettings called with options:", {
      voiceName: options.voiceName,
      hasVoiceObject: !!options.voice,
      rate: options.rate,
      pitch: options.pitch,
      volume: options.volume
    });

    // Always save to localStorage first for immediate access
    let localSaveSuccess = false;
    try {
      // Save voice settings
      localSaveSuccess = LocalStorageManager.saveVoiceSettings(options);
      console.log("LocalStorageManager.saveVoiceSettings result:", localSaveSuccess);

      // Save filter settings if they exist
      if (options.filterSettings) {
        LocalStorageManager.saveFilterSettings(options.filterSettings);
      }

      // Save user voice assignments if they exist
      if (options.userVoiceAssignments && options.userVoiceAssignments.length > 0) {
        LocalStorageManager.saveUserVoiceAssignments(options.userVoiceAssignments);
      }

      if (process.env.NODE_ENV === 'development') {
        console.log("Saved TTS settings to localStorage:", options);
      }
    } catch (err) {
      console.error("Error saving speech settings to localStorage:", err);
      localSaveSuccess = false;
    }

    // Then try to save to Supabase if logged in
    let supabaseSaveSuccess = false;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('user_settings')
          .select('channel_name')
          .eq('user_id', user.id)
          .single();

        const channelName = userData?.channel_name || 'default';

        // Prepare filter settings and user voice assignments for storage
        const filterSettingsJson = options.filterSettings ? JSON.stringify(options.filterSettings) : null;
        const userVoiceAssignmentsJson = options.userVoiceAssignments?.length
          ? JSON.stringify(options.userVoiceAssignments)
          : null;

        const { error } = await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            channel_name: channelName,
            tts_voice: options.voice ? options.voice.name : (typeof options.voiceName === 'string' ? options.voiceName : null),
            tts_rate: options.rate || 1,
            tts_pitch: options.pitch || 1,
            tts_volume: options.volume || 1,
            speak_usernames: options.speakUsernames,
            filter_settings: filterSettingsJson,
            user_voice_assignments: userVoiceAssignmentsJson,
            external_tts_enabled: options.externalTtsEnabled || false,
            external_tts_api_key: options.externalTtsApiKey || null,
            external_tts_voice_id: options.externalTtsVoiceId || null,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });

        if (error) {
          console.error("Error saving speech settings to Supabase:", error);
          supabaseSaveSuccess = false;
        } else {
          supabaseSaveSuccess = true;
          if (process.env.NODE_ENV === 'development') {
            console.log("Saved TTS settings to Supabase");
          }
        }
      }
    } catch (err) {
      console.error("Error saving speech settings to Supabase:", err);
      supabaseSaveSuccess = false;
    }

    // Return success if either localStorage or Supabase save was successful
    const success = localSaveSuccess || supabaseSaveSuccess;

    if (success) {
      toast.success("Voice settings saved");
    } else {
      toast.error("Failed to save voice settings");
    }

    return success;
  }
}

// Singleton instance
const settingsManager = new SettingsManager();
export default settingsManager;
