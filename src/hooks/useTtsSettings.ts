import { useState, useEffect } from 'react';
// Toast functionality removed
import speechService from '@/services/SpeechService';

export interface TtsSettings {
  voice: SpeechSynthesisVoice | null;
  rate: number;
  pitch: number;
  volume: number;
  speakUsernames: boolean;
}

/**
 * A hook for managing TTS settings
 *
 * @returns TTS settings state and functions to update it
 */
export function useTtsSettings() {
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRate] = useState<number>(1);
  const [pitch, setPitch] = useState<number>(1);
  const [volume, setVolume] = useState<number>(1);
  const [speakUsernames, setSpeakUsernames] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const options = await speechService.getOptions();
        if (options) {
          setRate(options.rate);
          setPitch(options.pitch);
          setVolume(options.volume);
          setSpeakUsernames(options.speakUsernames);

          // Set the voice if available
          if (options.voiceName) {
            const voices = speechService.getVoices();
            const voice = voices.find(v => v.name === options.voiceName);
            if (voice) {
              setSelectedVoice(voice);
            }
          }
        }
      } catch (error) {
        console.error('Error loading TTS settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Handle voice change
  const handleVoiceChange = (voice: SpeechSynthesisVoice | null) => {
    setSelectedVoice(voice);
  };

  // Handle rate change
  const handleRateChange = (value: number) => {
    setRate(value);
  };

  // Handle pitch change
  const handlePitchChange = (value: number) => {
    setPitch(value);
  };

  // Handle volume change
  const handleVolumeChange = (value: number) => {
    setVolume(value);
  };

  // Handle speak usernames change
  const handleSpeakUsernamesChange = (value: boolean) => {
    setSpeakUsernames(value);
  };

  // Test the current voice settings
  const testVoice = () => {
    if (!selectedVoice) {
      console.log('Please select a voice first'); 
      return;
    }

    speechService.testVoice(selectedVoice, rate, pitch, volume);
  };

  // Save the current settings
  const saveSettings = async () => {
    setIsSaving(true);

    try {
      await speechService.saveSettings({
        voiceName: selectedVoice?.name || '',
        rate,
        pitch,
        volume,
        speakUsernames
      });

    } catch (error) {
      console.error('Error saving voice settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    selectedVoice,
    rate,
    pitch,
    volume,
    speakUsernames,
    isLoading,
    isSaving,
    handleVoiceChange,
    handleRateChange,
    handlePitchChange,
    handleVolumeChange,
    handleSpeakUsernamesChange,
    testVoice,
    saveSettings
  };
}
