import { useSettings } from '@/contexts/SettingsContext';
import speechService from '@/services/SpeechService';
import { useState, useEffect } from 'react';

/**
 * A hook for using voice settings from the settings context
 *
 * @returns Voice settings and functions to update them
 */
export function useVoiceSettingsContext() {
  const {
    voiceSettings,
    updateVoiceSetting,
    saveVoiceSettings,
    resetVoiceSettings,
    isLoading,
    isSaving
  } = useSettings();

  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  // Load the selected voice on component mount
  useEffect(() => {
    if (!isLoading && voiceSettings.voiceName) {
      const voices = speechService.getVoices();
      const voice = voices.find(v => v.name === voiceSettings.voiceName);
      if (voice) {
        setSelectedVoice(voice);
      }
    }
  }, [isLoading, voiceSettings.voiceName]);

  // Handle voice change
  const handleVoiceChange = (voice: SpeechSynthesisVoice | null) => {
    setSelectedVoice(voice);
    updateVoiceSetting('voiceName', voice?.name || '');
  };

  // Handle rate change
  const handleRateChange = (value: number) => {
    updateVoiceSetting('rate', value);
  };

  // Handle pitch change
  const handlePitchChange = (value: number) => {
    updateVoiceSetting('pitch', value);
  };

  // Handle volume change
  const handleVolumeChange = (value: number) => {
    updateVoiceSetting('volume', value);
  };

  // This functionality has been moved to filter settings

  // Test the current voice settings
  const testVoice = () => {
    if (!selectedVoice) {
      return;
    }

    speechService.testVoice(
      selectedVoice,
      voiceSettings.rate,
      voiceSettings.pitch,
      voiceSettings.volume
    );
  };

  return {
    selectedVoice,
    rate: voiceSettings.rate,
    pitch: voiceSettings.pitch,
    volume: voiceSettings.volume,
    isLoading,
    isSaving,
    handleVoiceChange,
    handleRateChange,
    handlePitchChange,
    handleVolumeChange,
    testVoice,
    saveSettings: saveVoiceSettings,
    resetToDefaults: resetVoiceSettings
  };
}
