
// Toast functionality removed
export type { SpeechOptions, MessageFilterSettings, UserVoiceAssignment, SpeechQueueItem, RegexFilter } from "./speech/types";
// import voiceManager from "./speech/voiceManager"; // voiceManager is imported but not used
import settingsManager from "./speech/settingsManager";
import speechQueue from "./speech/speechQueue";
import LocalStorageManager from "./LocalStorageManager";
import { SpeechOptions } from "./speech/types";

export class SpeechService {
  private initialized: boolean = false;
  private listeners: { [eventName: string]: Array<(...args: any[]) => void> } = {};

  private currentOptions: SpeechOptions = {
    rate: 1,
    pitch: 1,
    volume: 1,
    randomizeVoice: false,
    includedVoicesForRandomization: [],
    excludedVoicesForRandomization: [],
    filterSettings: {
      enabled: true,
      keywordBlacklist: [],
      userBlacklist: [],
      speakUsernames: true,
      useNicknames: false,
      userNicknames: [],
      skipEmojisInMessage: true,
      skipLinksInMessage: true,
      skipBotMessages: true,
      specificUsersOnly: false,
      specificUsersList: [],
      // regexFilters removed
      wordReplacements: [],
      minMessageLength: 0,
      maxMessageLength: 500,
      userCooldown: 0,
      priorityUsers: []
    },
    userVoiceAssignments: [],
    externalTtsEnabled: false
  };

  constructor() {
    console.log("SpeechService constructor called");

    // LocalStorageManager is now imported statically at the top of the file
    console.log("LocalStorage ready for use");

    // Immediately try to load settings from localStorage
    this.loadSettingsFromLocalStorage();

    // Wait for voices to load before fully initializing settings
    // Try multiple times with increasing delays to ensure we load settings properly
    const initializationTimes = [500, 1000, 2000, 3000];
    console.log("Setting up initialization timers");

    initializationTimes.forEach((delay) => {
      setTimeout(async () => {
        // Only initialize if we don't have a voice yet but have a voice name
        if (!this.currentOptions.voice && this.currentOptions.voiceName) {
          await this.initializeSettings();
        }
      }, delay);
    });

    // Set up a periodic check to ensure settings are applied
    // This helps in case settings are loaded but not properly applied
    setInterval(async () => {
      // Only refresh if we have a voice name but no voice object
      if (this.currentOptions.voiceName && !this.currentOptions.voice) {
        const voices = this.getVoices();
        if (voices.length > 0) {
          this.currentOptions.voice = voices.find(v => v.name === this.currentOptions.voiceName);
          if (this.currentOptions.voice) {
            speechQueue.setOptions(this.currentOptions);
            console.log("Found voice in periodic check:", this.currentOptions.voiceName);
          }
        }
      }
    }, 5000);
  }

  /**
   * Load settings directly from localStorage for immediate access
   * This is called in the constructor for fastest possible settings loading
   */
  private loadSettingsFromLocalStorage(): void {
    console.log("loadSettingsFromLocalStorage called");
    try {
      // LocalStorageManager is now imported statically at the top of the file
      const localSettings = LocalStorageManager.loadVoiceSettings();
      console.log("Loaded voice settings from localStorage:", localSettings);
      const localFilterSettings = LocalStorageManager.loadFilterSettings();
      const localUserVoiceAssignments = LocalStorageManager.loadUserVoiceAssignments();

      // Only proceed if we have saved settings - we don't set defaults anymore
      if (localSettings && localSettings.voiceName) {
        // Find the voice object by name if available
        let voice = undefined;
        if (localSettings.voiceName) {
          const voices = this.getVoices();
          if (voices.length > 0) {
            voice = voices.find(v => v.name === localSettings.voiceName);
          }
        }

        // Update current options with saved settings
        this.currentOptions = {
          ...this.currentOptions,
          voice,
          voiceName: localSettings.voiceName,
          rate: localSettings.rate || 1,
          pitch: localSettings.pitch || 1,
          volume: localSettings.volume || 1,
          randomizeVoice: localSettings.randomizeVoice ?? false,
          includedVoicesForRandomization: localSettings.includedVoicesForRandomization || [],
          excludedVoicesForRandomization: localSettings.excludedVoicesForRandomization || [],
          speakUsernames: localSettings.speakUsernames ?? true,
          filterSettings: localFilterSettings || this.currentOptions.filterSettings,
          userVoiceAssignments: localUserVoiceAssignments || [],
          externalTtsEnabled: localSettings.externalTtsEnabled ?? false,
          externalTtsApiKey: localSettings.externalTtsApiKey,
          externalTtsVoiceId: localSettings.externalTtsVoiceId
        };

        // Apply settings to speech queue
        speechQueue.setOptions(this.currentOptions);

        // If we don't have a voice yet but have a voiceName, try to find it again
        // This is a fallback for cases where voices weren't loaded yet
        if (this.currentOptions.voiceName && !this.currentOptions.voice) {
          // Try multiple times with increasing delays to ensure we find the voice
          const retryTimes = [500, 1000, 2000, 3000];

          retryTimes.forEach((delay, index) => {
            setTimeout(() => {
              if (!this.currentOptions.voice) {
                const voices = this.getVoices();
                if (voices.length > 0) {
                  this.currentOptions.voice = voices.find(v => v.name === this.currentOptions.voiceName);
                  if (this.currentOptions.voice) {
                    speechQueue.setOptions(this.currentOptions);
                    console.log(`Found voice on retry ${index + 1}:`, this.currentOptions.voiceName);
                  }
                }
              }
            }, delay);
          });
        }

        console.log("Loaded voice settings from localStorage:", {
          voiceName: this.currentOptions.voiceName,
          rate: this.currentOptions.rate,
          pitch: this.currentOptions.pitch,
          volume: this.currentOptions.volume
        });
      } else {
        console.log("No saved voice settings found in localStorage - user needs to select a voice");
      }
    } catch (error) {
      console.error("Error loading settings from localStorage on startup:", error);
    }
  }

  /**
   * Initialize settings from storage and apply them
   * This is called on startup and can be called manually to refresh settings
   */
  public async initializeSettings(): Promise<void> {
    const settings = await this.loadSettings();
    if (settings) {
      // If settings include a voiceName but no voice object, try to find the voice
      if (settings.voiceName && !settings.voice) {
        const voices = this.getVoices();
        settings.voice = voices.find(v => v.name === settings.voiceName) || undefined;
      }

      this.currentOptions = { ...this.currentOptions, ...settings };
      speechQueue.setOptions(this.currentOptions);

      // Settings initialized successfully
    }
  }

  public async loadSettings(): Promise<SpeechOptions | null> {
    // Load settings from settingsManager (which uses Supabase)
    const settings = await settingsManager.loadSettings();

    if (settings) {
      // If settings include a voiceName but no voice object, try to find the voice
      if (settings.voiceName && !settings.voice) {
        const voices = this.getVoices();
        settings.voice = voices.find(v => v.name === settings.voiceName) || undefined;
      }

      // Update current options with loaded settings
      this.currentOptions = { ...this.currentOptions, ...settings };

      // Settings loaded successfully
    }

    return settings;
  }

  public async saveSettings(options: SpeechOptions): Promise<boolean> {
    console.log("saveSettings called with options:", {
      voiceName: options.voiceName,
      hasVoiceObject: !!options.voice,
      rate: options.rate,
      pitch: options.pitch,
      volume: options.volume,
      randomizeVoice: options.randomizeVoice,
      includedVoicesCount: options.includedVoicesForRandomization?.length || 0,
      excludedVoicesCount: options.excludedVoicesForRandomization?.length || 0
    });

    // If options includes a voice object, make sure to also set the voiceName
    if (options.voice && !options.voiceName) {
      options.voiceName = options.voice.name;
      console.log("Set voiceName from voice object:", options.voiceName);
    }

    // If options includes a voiceName but no voice object, try to find the voice
    if (options.voiceName && !options.voice) {
      const voices = this.getVoices();
      options.voice = voices.find(v => v.name === options.voiceName) || undefined;
      console.log("Tried to find voice object for voiceName:", options.voiceName, "Found:", !!options.voice);
    }

    // Merge with current options to ensure we have a complete set
    const mergedOptions = { ...this.currentOptions, ...options };

    // Save to persistent storage
    const success = await settingsManager.saveSettings(mergedOptions);

    if (success) {
      // Update current options in memory
      this.currentOptions = mergedOptions;

      // Apply settings to speech queue
      speechQueue.setOptions(this.currentOptions);

      // Notify the UI that settings have changed
      this.notifySettingsChanged();

      // Settings saved and applied successfully
    }

    return success;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    return voiceManager.getVoices();
  }

  /**
   * Get the current speech options
   * This is used by components to get the current settings
   */
  public async getCurrentOptions(): Promise<SpeechOptions> {
    return { ...this.currentOptions };
  }

  public setOptions(options: SpeechOptions): void {
    this.currentOptions = { ...this.currentOptions, ...options };

    // Always pass the complete options to ensure all settings are applied
    speechQueue.setOptions(this.currentOptions);
    // Notify settings changed to ensure UI consistency
    this.notifySettingsChanged();
  }

  public speak(text: string, priority: number = 0, username?: string, messageId?: string): void {
    speechQueue.speak(text, priority, username, messageId);
  }

  public async shouldReadMessage(message: string, username?: string): Promise<boolean> {
    return await speechQueue.shouldReadMessage(message, username);
  }

  public formatMessageForSpeech(username: string, message: string): string {
    return speechQueue.formatMessageForSpeech(username, message);
  }

  public getFilterSettings(): any {
    return this.currentOptions.filterSettings || {
      enabled: true,
      skipEmojisInMessage: true,
      skipLinksInMessage: true,
      skipBotMessages: true
    };
  }

  public stop(): void {
    speechQueue.stop();
  }

  private isMuted: boolean = false;

  /**
   * Set the mute state and update the speech queue accordingly
   * This is the central method for controlling mute state across the application
   */
  public setMuteState(muted: boolean): void {
    // Only take action if the state is actually changing
    if (this.isMuted !== muted) {
      console.log(`[SpeechService] Setting mute state to ${muted}`);
      this.isMuted = muted;

      if (this.isMuted) {
        // Stop current speech and pause queue processing
        speechQueue.stop();
      } else {
        // Resume queue processing
        speechQueue.resume();
      }

      // Notify UI about mute state change
      if (typeof window !== 'undefined') {
        // Dispatch event to notify components
        const event = new CustomEvent('speech-settings-changed', {
          detail: {
            type: 'info',
            message: muted ? 'TTS muted' : 'TTS enabled',
            muted: this.isMuted
          }
        });
        window.dispatchEvent(event);

        try {
          // Send mute state to server via fetch API
          fetch(`/api/tts/mute`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ muted: this.isMuted })
          }).catch(err => {
            console.warn('[SpeechService] Failed to sync mute state with server:', err);
          });
        } catch (error) {
          console.warn('[SpeechService] Error syncing mute state with server:', error);
        }
      }
    }
  }

  /**
   * Toggle the current mute state
   */
  public toggleMute(): void {
    this.setMuteState(!this.isMuted);
  }

  /**
   * Get the current mute state
   */
  public getMuteState(): boolean {
    return this.isMuted;
  }

  private currentlyPlayingMessage: SpeechQueueItem | null = null;

  // Method to set the currently playing message
  public setCurrentMessage(message: SpeechQueueItem | null): void {
    this.currentlyPlayingMessage = message;
  }

  public getCurrentMessage(): SpeechQueueItem | null {
    // Return the tracked currently speaking message
    return this.currentlyPlayingMessage;
  }

  /**
   * Adjust the volume by the specified amount
   * @param amount Amount to adjust volume by (-1 to 1)
   */
  public adjustVolume(amount: number): void {
    const currentVolume = this.currentOptions.volume || 1;
    let newVolume = currentVolume + amount;

    // Clamp volume between 0 and 1
    newVolume = Math.max(0, Math.min(1, newVolume));

    // Update options in memory only - don't save to storage
    this.currentOptions.volume = newVolume;
    speechQueue.setOptions(this.currentOptions);

    // Show notification in status bar instead of toast
    window.dispatchEvent(new CustomEvent('status-notification', {
      detail: {
        type: 'info',
        message: `Volume: ${Math.round(newVolume * 100)}%`
      }
    }));
  }

  /**
   * Adjust the speech rate by the specified amount
   * @param amount Amount to adjust rate by (-1 to 1)
   */
  public adjustRate(amount: number): void {
    const currentRate = this.currentOptions.rate || 1;
    let newRate = currentRate + amount;

    // Clamp rate between 0.1 and 2
    newRate = Math.max(0.1, Math.min(2, newRate));

    // Update options in memory only - don't save to storage
    this.currentOptions.rate = newRate;
    speechQueue.setOptions(this.currentOptions);

    // Show notification in status bar instead of toast
    window.dispatchEvent(new CustomEvent('status-notification', {
      detail: {
        type: 'info',
        message: `Speech rate: ${newRate.toFixed(1)}x`
      }
    }));
  }

  public pause(): void {
    speechQueue.pause();
  }

  public resume(): void {
    speechQueue.resume();
  }

  public isSpeaking(): boolean {
    return speechQueue.isSpeaking();
  }

  public getOptions(): Promise<SpeechOptions> {
    return Promise.resolve(this.currentOptions);
  }

  /**
   * Initialize the speech service
   * This ensures that the speech synthesis voices are loaded
   */
  public initialize(): void {
    if (this.initialized) {
      console.log('[SpeechService] Already initialized, skipping initialization');
      return;
    }

    console.log('[SpeechService] Initializing speech service...');

    // Load settings from local storage first
    this.loadSettingsFromLocalStorage();

    // Force the browser to load voices
    if (window.speechSynthesis) {
      console.log('[SpeechService] Initializing speech synthesis...');

      // Get voices to force initialization
      let voices = window.speechSynthesis.getVoices();

      // If no voices are available yet, wait for them to load
      if (voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          voices = window.speechSynthesis.getVoices();
          console.log(`[SpeechService] Speech synthesis initialized with ${voices.length} voices`);
          this.initialized = true;

          // Dispatch an event to notify that speech service is ready
          const event = new CustomEvent('speech-service-ready', {
            detail: { voicesCount: voices.length }
          });
          window.dispatchEvent(event);
        };
      } else {
        console.log(`[SpeechService] Speech synthesis initialized with ${voices.length} voices`);
        this.initialized = true;

        // Dispatch an event to notify that speech service is ready
        const event = new CustomEvent('speech-service-ready', {
          detail: { voicesCount: voices.length }
        });
        window.dispatchEvent(event);
      }
    } else {
      console.warn('[SpeechService] Speech synthesis not supported in this browser');
    }
  }

  /**
   * Get the current volume setting
   */
  public getVolume(): number {
    return this.currentOptions.volume || 1;
  }

  /**
   * Get the current voice name
   */
  public getVoiceName(): string {
    return this.currentOptions.voiceName || 'Default';
  }

  /**
   * Notify listeners that settings have changed.
   */
  private notifySettingsChanged(): void {
    console.log('[SpeechService] Notifying settings changed.');
    this.emit('settingsChanged');
    // Also dispatch a window event for broader compatibility if needed by other parts of the app
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('speech-settings-changed', {
        detail: { type: 'settingsUpdate', options: { ...this.currentOptions } }
      });
      window.dispatchEvent(event);
    }
  }

  // Event Emitter methods
  public on(eventName: string, callback: (...args: any[]) => void): void {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
  }

  public off(eventName: string, callback: (...args: any[]) => void): void {
    if (!this.listeners[eventName]) {
      return;
    }
    this.listeners[eventName] = this.listeners[eventName].filter(listener => listener !== callback);
  }

  private emit(eventName: string, ...args: any[]): void {
    if (!this.listeners[eventName]) {
      return;
    }
    this.listeners[eventName].forEach(listener => listener(...args));
  }

  /**
   * Skip the current message and play the next one in the queue
   */
  public skipCurrent(): void {
    speechQueue.skipCurrent();
  }

  /**
   * Remove a specific item from the queue by its messageId
   */
  public removeFromQueue(messageId: string): boolean {
    return speechQueue.removeFromQueue(messageId);
  }

  /**
   * Reorder the queue by moving an item to a new position
   */
  public reorderQueue(messageId: string, newPosition: number): boolean {
    return speechQueue.reorderQueue(messageId, newPosition);
  }

  /**
   * Notify the UI that settings have changed
   * This triggers a status bar update and notifies components
   */
  private notifySettingsChanged(): void {
    if (typeof window !== 'undefined') {
      console.log('[SpeechService] Notifying UI of settings change');

      // Use CustomEvent to pass notification details
      const event = new CustomEvent('speech-settings-changed', {
        detail: {
          type: 'success',
          message: `Voice settings updated: ${this.getVoiceName()}`,
          muted: this.isMuted,
          volume: this.currentOptions.volume,
          rate: this.currentOptions.rate,
          pitch: this.currentOptions.pitch,
          voiceName: this.currentOptions.voiceName
        }
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Preload audio for a specific message
   * This is useful for preparing audio before it's needed
   */
  public async preloadAudio(text: string, messageId: string): Promise<boolean> {
    // If external TTS is enabled, use that
    if (this.currentOptions.externalTtsEnabled && this.currentOptions.externalTtsApiKey) {
      try {
        // This would normally fetch the audio from an external API
        // For now, we'll just simulate a delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
      } catch (error) {
        console.error('Error preloading audio:', error);
        return false;
      }
    }

    // For browser TTS, we don't need to preload
    // Just simulate a delay for the UI
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
  }

  /**
   * Skip a specific message in the queue
   */
  public skipMessage(messageId: string): boolean {
    return speechQueue.removeFromQueue(messageId);
  }
}

// Singleton instance
const speechService = new SpeechService();

// Add to window object for global access
if (typeof window !== 'undefined') {
  window.speechService = speechService;
}

export default speechService;
