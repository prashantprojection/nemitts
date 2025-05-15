import React, { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Volume2, VolumeX, Save } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import speechService from '@/services/SpeechService';
import { toast } from 'sonner';

interface VoiceControlsPanelProps {
  onBack?: () => void;
}

const VoiceControlsPanel = ({ onBack }: VoiceControlsPanelProps) => {
  const { voiceSettings, updateVoiceSetting, saveVoiceSettings } = useSettings();

  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(voiceSettings.volume || 1);
  const [rate, setRate] = useState(voiceSettings.rate || 1);
  const [pitch, setPitch] = useState(voiceSettings.pitch || 1);

  // Update local state when voiceSettings change
  useEffect(() => {
    setVolume(voiceSettings.volume || 1);
    setRate(voiceSettings.rate || 1);
    setPitch(voiceSettings.pitch || 1);
  }, [voiceSettings]);

  // Initialize mute state
  useEffect(() => {
    setIsMuted(speechService.getMuteState());
  }, []);

  // Update local state when sliders change, but don't apply until save
  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    // Only adjust volume for preview purposes, don't save yet
    speechService.adjustVolume(value[0]);
  };

  const handleRateChange = (value: number[]) => {
    setRate(value[0]);
  };

  const handlePitchChange = (value: number[]) => {
    setPitch(value[0]);
  };

  // Toggle mute
  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    speechService.setMuteState(newMutedState);

    if (newMutedState) {
      speechService.stop();
      toast.info("Text-to-speech muted");
    } else {
      toast.info("Text-to-speech enabled");
    }
  };

  // Save settings
  const handleSave = async () => {
    try {
      // Update the context with all the local changes
      updateVoiceSetting('rate', rate);
      updateVoiceSetting('pitch', pitch);
      updateVoiceSetting('volume', volume);

      // Update the speech service with the new settings
      await speechService.saveSettings({
        ...voiceSettings,
        rate: rate,
        pitch: pitch,
        volume: volume
      });

      // Save to the settings context for persistence
      await saveVoiceSettings();

      // Show success message
      toast.success('Voice controls saved successfully');
    } catch (error) {
      console.error('Error saving voice settings:', error);
      toast.error('Failed to save voice controls');
    }
  };

  // Test current voice with current settings
  const testVoice = () => {
    const voice = speechService.getVoiceByName(voiceSettings.voiceName || '');
    if (voice) {
      speechService.testVoice(voice, rate, pitch, volume);
    } else {
      toast.error('No voice selected. Please select a voice first.');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full mr-2 text-muted-foreground hover:text-foreground"
            onClick={onBack}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </Button>
          <h2 className="font-medium">Voice Controls</h2>
        </div>


      </div>

      {/* Controls */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          <div className="space-y-3 bg-card/30 p-4 rounded-lg border border-border/50">
            <div className="flex items-center justify-between">
              <Label htmlFor="volume" className="text-sm font-medium flex items-center">
                <Volume2 className="h-4 w-4 mr-2 text-primary" />
                Volume
              </Label>
              <span className="text-xs font-mono bg-muted/50 px-2 py-1 rounded text-muted-foreground">{Math.round(volume * 100)}%</span>
            </div>
            <Slider
              id="volume"
              min={0}
              max={1}
              step={0.05}
              value={[volume]}
              onValueChange={handleVolumeChange}
              className="z-0"
            />
          </div>

          <div className="space-y-3 bg-card/30 p-4 rounded-lg border border-border/50">
            <div className="flex items-center justify-between">
              <Label htmlFor="rate" className="text-sm font-medium flex items-center">
                <svg className="h-4 w-4 mr-2 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                Speed
              </Label>
              <span className="text-xs font-mono bg-muted/50 px-2 py-1 rounded text-muted-foreground">{Math.round(rate * 100)}%</span>
            </div>
            <Slider
              id="rate"
              min={0.5}
              max={2}
              step={0.05}
              value={[rate]}
              onValueChange={handleRateChange}
              className="z-0"
            />
          </div>

          <div className="space-y-3 bg-card/30 p-4 rounded-lg border border-border/50">
            <div className="flex items-center justify-between">
              <Label htmlFor="pitch" className="text-sm font-medium flex items-center">
                <svg className="h-4 w-4 mr-2 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
                  <line x1="2" y1="20" x2="2" y2="20" />
                </svg>
                Pitch
              </Label>
              <span className="text-xs font-mono bg-muted/50 px-2 py-1 rounded text-muted-foreground">{Math.round(pitch * 100)}%</span>
            </div>
            <Slider
              id="pitch"
              min={0.5}
              max={2}
              step={0.05}
              value={[pitch]}
              onValueChange={handlePitchChange}
              className="z-0"
            />
          </div>

          <div className="p-4 rounded-lg border border-border/50 bg-card/30">
            <Button
              onClick={testVoice}
              className="w-full h-10 rounded-md flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground transition-all duration-200 shadow-md font-medium"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Test Current Voice
            </Button>
            <div className="text-xs text-muted-foreground mt-2 text-center">
              Test the current voice with these settings
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer with Save Button */}
      <div className="border-t border-border/30 p-3">
        <Button
          onClick={handleSave}
          className="w-full h-10 rounded-md flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 shadow-md font-medium"
        >
          <Save className="h-4 w-4" />
          Save Controls
        </Button>
      </div>
    </div>
  );
};

export default VoiceControlsPanel;
