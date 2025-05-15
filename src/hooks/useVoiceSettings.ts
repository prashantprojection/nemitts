
import { useState, useEffect } from "react";
// Toast functionality removed
import speechService from "@/services/SpeechService";
import LocalStorageManager from "@/services/LocalStorageManager";
import { supabase } from "@/integrations/supabase/client";

export const useVoiceSettings = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  // Current settings (what's being edited)
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [rate, setRate] = useState<number>(1);
  const [pitch, setPitch] = useState<number>(1);
  const [volume, setVolume] = useState<number>(1);
  const [speakUsernames, setSpeakUsernames] = useState<boolean>(true);

  // Saved settings (what's actually applied)
  const [savedVoice, setSavedVoice] = useState<string>("");
  const [savedRate, setSavedRate] = useState<number>(1);
  const [savedPitch, setSavedPitch] = useState<number>(1);
  const [savedVolume, setSavedVolume] = useState<number>(1);
  const [savedSpeakUsernames, setSavedSpeakUsernames] = useState<boolean>(true);

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [settingsLoaded, setSettingsLoaded] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [showSavedToast, setShowSavedToast] = useState<boolean>(false);

  // Original settings for change detection
  const [originalSettings, setOriginalSettings] = useState<{voice: string, rate: number, pitch: number, volume: number}>({voice: "", rate: 1, pitch: 1, volume: 1});

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = speechService.getVoices();
      setVoices(availableVoices);

      if (availableVoices.length > 0 && !settingsLoaded) {
        loadSettings();
      }
    };

    loadVoices();

    // Wait for voices to load in Chrome
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Also load settings when component mounts, even if voices are already loaded
    if (!settingsLoaded) {
      loadSettings();
    }

    // Set up multiple timers to check if settings are loaded
    // This helps in cases where the voices are available but settings aren't loaded yet
    const timers = [1000, 2000, 3000, 5000].map(delay =>
      setTimeout(() => {
        if (!settingsLoaded) {
          console.log(`Retrying loadSettings after ${delay}ms`);
          loadSettings();
        } else {
          console.log(`Settings already loaded, no need to retry after ${delay}ms`);
        }
      }, delay)
    );

    return () => timers.forEach(timer => clearTimeout(timer));
  }, [settingsLoaded]); // Only depend on settingsLoaded, not savedVoice

  // Apply saved settings when they change
  useEffect(() => {
    if (!settingsLoaded || voices.length === 0) return;

    // Find the voice object by name
    const voice = voices.find(v => v.name === savedVoice);

    // Apply saved settings to speech service
    speechService.setOptions({
      voice,
      voiceName: savedVoice,
      rate: savedRate,
      pitch: savedPitch,
      volume: savedVolume,
      speakUsernames: savedSpeakUsernames
    });

    // Just apply the settings without saving them to storage
    // We only want to save settings when the user explicitly clicks the save button

    // Current voice settings applied
  }, [savedVoice, savedRate, savedPitch, savedVolume, savedSpeakUsernames, voices, settingsLoaded]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      // First try to load settings from SpeechService
      const currentOptions = await speechService.getCurrentOptions();

      console.log("Current options from SpeechService:", {
        voiceName: currentOptions.voiceName,
        rate: currentOptions.rate,
        pitch: currentOptions.pitch,
        volume: currentOptions.volume
      });

      // Also check localStorage directly for debugging
      try {
        // LocalStorageManager is now imported statically at the top of the file
        const localSettings = LocalStorageManager.loadVoiceSettings();
        console.log("DEBUG - Direct localStorage check:", localSettings);
      } catch (e) {
        console.error("Error checking localStorage directly:", e);
      }

      // Always apply settings from SpeechService, even if voiceName is not set
      // This ensures we at least have default values
      setRate(currentOptions.rate || 1);
      setPitch(currentOptions.pitch || 1);
      setVolume(currentOptions.volume || 1);
      setSpeakUsernames(currentOptions.speakUsernames ?? true);

      setSavedRate(currentOptions.rate || 1);
      setSavedPitch(currentOptions.pitch || 1);
      setSavedVolume(currentOptions.volume || 1);
      setSavedSpeakUsernames(currentOptions.speakUsernames ?? true);

      // If we have a voiceName, use it
      if (currentOptions.voiceName) {
        setSelectedVoice(currentOptions.voiceName);
        setSavedVoice(currentOptions.voiceName);

        // Update original settings for change detection
        setOriginalSettings({
          voice: currentOptions.voiceName,
          rate: currentOptions.rate || 1,
          pitch: currentOptions.pitch || 1,
          volume: currentOptions.volume || 1
        });

        console.log("Voice settings loaded from SpeechService:", currentOptions.voiceName);
      } else {
        // If no voiceName in SpeechService, try to load from localStorage directly
        try {
          // LocalStorageManager is now imported statically at the top of the file
          const localSettings = LocalStorageManager.loadVoiceSettings();

          if (localSettings && localSettings.voiceName) {
            console.log("Found voice settings in localStorage:", localSettings.voiceName);

            // Apply saved settings from localStorage
            setRate(localSettings.rate || 1);
            setPitch(localSettings.pitch || 1);
            setVolume(localSettings.volume || 1);
            setSpeakUsernames(localSettings.speakUsernames ?? true);

            setSavedRate(localSettings.rate || 1);
            setSavedPitch(localSettings.pitch || 1);
            setSavedVolume(localSettings.volume || 1);
            setSavedSpeakUsernames(localSettings.speakUsernames ?? true);

            setSelectedVoice(localSettings.voiceName);
            setSavedVoice(localSettings.voiceName);

            // Update original settings for change detection
            setOriginalSettings({
              voice: localSettings.voiceName,
              rate: localSettings.rate || 1,
              pitch: localSettings.pitch || 1,
              volume: localSettings.volume || 1
            });

            // Also update SpeechService with these settings
            const voice = voices.find(v => v.name === localSettings.voiceName);
            speechService.setOptions({
              voice,
              voiceName: localSettings.voiceName,
              rate: localSettings.rate || 1,
              pitch: localSettings.pitch || 1,
              volume: localSettings.volume || 1,
              speakUsernames: localSettings.speakUsernames ?? true
            });

            setSettingsLoaded(true);
            setIsLoading(false);
            return; // Exit early since we found settings
          }
        } catch (error) {
          console.error("Error loading from localStorage directly:", error);
        }

        // If still no settings, try to load from Supabase
        const { data: session } = await supabase.auth.getSession();

        if (session?.session?.user) {
          // Get user settings from Supabase
          const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', session.session.user.id)
            .single();

          if (data && !error && data.tts_voice) {
            console.log("Found voice settings in Supabase:", data.tts_voice);

            // Apply saved settings
            setRate(data.tts_rate);
            setPitch(data.tts_pitch);
            setVolume(data.tts_volume);
            setSpeakUsernames(data.speak_usernames ?? true);

            setSavedRate(data.tts_rate);
            setSavedPitch(data.tts_pitch);
            setSavedVolume(data.tts_volume);
            setSavedSpeakUsernames(data.speak_usernames ?? true);

            setSelectedVoice(data.tts_voice);
            setSavedVoice(data.tts_voice);

            // Update original settings for change detection
            setOriginalSettings({
              voice: data.tts_voice,
              rate: data.tts_rate,
              pitch: data.tts_pitch,
              volume: data.tts_volume
            });
          }
        }
      }

      setSettingsLoaded(true);
    } catch (err) {
      console.error("Error in loadSettings:", err);
      // Just log the error but don't set any default voice
    } finally {
      setIsLoading(false);
    }
  };

  // No default voice selection - we only use saved settings

  const handleVoiceChange = (value: string) => {
    setSelectedVoice(value);
    setHasChanges(value !== originalSettings.voice);
  };

  const handleRateChange = (value: number[]) => {
    setRate(value[0]);
    setHasChanges(value[0] !== originalSettings.rate || selectedVoice !== originalSettings.voice);
  };

  const handlePitchChange = (value: number[]) => {
    setPitch(value[0]);
    setHasChanges(value[0] !== originalSettings.pitch || selectedVoice !== originalSettings.voice || rate !== originalSettings.rate);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    setHasChanges(value[0] !== originalSettings.volume || selectedVoice !== originalSettings.voice || rate !== originalSettings.rate || pitch !== originalSettings.pitch);
  };

  const handleSpeakUsernamesChange = (checked: boolean) => {
    setSpeakUsernames(checked);
  };

  const testVoice = () => {
    // Find the voice object by name for preview
    const voice = voices.find(v => v.name === selectedVoice);

    if (!voice) {
      console.log("Voice not found for testing:", selectedVoice);
      return;
    }

    // Use the testVoice method to properly test the voice
    speechService.testVoice(voice, rate, pitch, volume);
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      console.log("Saving voice settings with selectedVoice:", selectedVoice);
      const voice = voices.find(v => v.name === selectedVoice);

      if (!selectedVoice || !voice) {
        setIsSaving(false);
        return;
      }

      console.log("Found voice object:", voice.name);

      // First apply the settings immediately to ensure they take effect
      speechService.setOptions({
        voice,
        voiceName: selectedVoice,
        rate,
        pitch,
        volume,
        speakUsernames
      });

      // Then save them to persistent storage
      const result = await speechService.saveSettings({
        voice,
        voiceName: selectedVoice,
        rate,
        pitch,
        volume,
        speakUsernames
      });

      if (result) {
        console.log("Settings saved successfully, updating UI state with voice:", selectedVoice);

        // Update saved settings to match current settings
        setSavedVoice(selectedVoice);
        setSavedRate(rate);
        setSavedPitch(pitch);
        setSavedVolume(volume);
        setSavedSpeakUsernames(speakUsernames);

        // Verify localStorage was updated
        try {
          // LocalStorageManager is now imported statically at the top of the file
          const localSettings = LocalStorageManager.loadVoiceSettings();
          console.log("After save - localStorage check:", localSettings);
        } catch (e) {
          console.error("Error checking localStorage after save:", e);
        }

        // Update original settings for change detection
        setOriginalSettings({
          voice: selectedVoice,
          rate,
          pitch,
          volume
        });

        // Reset the hasChanges flag
        setHasChanges(false);

        // Test the voice to provide audible feedback that the settings were applied
        setTimeout(() => {
          const testVoiceObj = voices.find(v => v.name === selectedVoice);
          if (testVoiceObj) {
            const utterance = new SpeechSynthesisUtterance("Voice settings saved");
            utterance.voice = testVoiceObj;
            utterance.rate = rate;
            utterance.pitch = pitch;
            utterance.volume = volume;
            window.speechSynthesis.speak(utterance);
          }
        }, 500);

        // Hide the toast after 3 seconds
        setTimeout(() => {
          setShowSavedToast(false);
          // Also update the original settings to match the new saved settings
          // This ensures hasChanges is properly reset
          setOriginalSettings({
            voice: selectedVoice,
            rate,
            pitch,
            volume
          });
        }, 3000);
      }
    } catch (err) {
    } finally {
      setIsSaving(false);
    }
  };

  // Function to update any settings
  const updateSettings = (newSettings: any) => {
    if (newSettings.voice !== undefined) setSelectedVoice(newSettings.voice);
    if (newSettings.rate !== undefined) setRate(newSettings.rate);
    if (newSettings.pitch !== undefined) setPitch(newSettings.pitch);
    if (newSettings.volume !== undefined) setVolume(newSettings.volume);
    if (newSettings.speakUsernames !== undefined) setSpeakUsernames(newSettings.speakUsernames);
  };

  return {
    // Current settings (being edited)
    selectedVoice,
    rate,
    pitch,
    volume,
    speakUsernames,

    // Saved settings (currently applied)
    savedVoice,
    savedRate,
    savedPitch,
    savedVolume,
    savedSpeakUsernames,

    // UI state
    isLoading,
    isSaving,
    hasChanges,
    showSavedToast,

    // Handlers
    handleVoiceChange,
    handleRateChange,
    handlePitchChange,
    handleVolumeChange,
    handleSpeakUsernamesChange,
    updateSettings,
    testVoice,
    saveSettings
  };
};
