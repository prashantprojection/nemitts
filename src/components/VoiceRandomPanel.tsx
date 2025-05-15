import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Save } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import speechService from '@/services/SpeechService';
import { toast } from 'sonner';

interface VoiceRandomPanelProps {
  onBack?: () => void;
}

const VoiceRandomPanel = ({ onBack }: VoiceRandomPanelProps) => {
  const { voiceSettings, updateVoiceSetting, saveVoiceSettings } = useSettings();

  const [randomizeVoice, setRandomizeVoice] = useState(voiceSettings.randomizeVoice || false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [includedVoices, setIncludedVoices] = useState<string[]>([]);

  // Update local state when voiceSettings change
  useEffect(() => {
    setRandomizeVoice(voiceSettings.randomizeVoice || false);
    setIncludedVoices(voiceSettings.includedVoicesForRandomization || []);
  }, [voiceSettings]);

  // Load voices
  useEffect(() => {
    // Load available voices
    const loadVoices = () => {
      const availableVoices = speechService.getVoices();
      setVoices(availableVoices);

      // Initialize included voices if empty
      if (!voiceSettings.includedVoicesForRandomization || voiceSettings.includedVoicesForRandomization.length === 0) {
        const allVoiceNames = availableVoices.map(voice => voice.name);
        setIncludedVoices(allVoiceNames);

        // Also update the settings context
        updateVoiceSetting('includedVoicesForRandomization', allVoiceNames);

        // And update the speech service directly
        speechService.getOptions().then(options => {
          speechService.setOptions({
            ...options,
            includedVoicesForRandomization: allVoiceNames
          });
        });
      }
    };

    loadVoices();

    // Check for Chrome's onvoiceschanged event
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Also add a listener for the speech-service-ready event
    const handleSpeechServiceReady = () => {
      loadVoices();
    };

    window.addEventListener('speech-service-ready', handleSpeechServiceReady);

    return () => {
      window.removeEventListener('speech-service-ready', handleSpeechServiceReady);
    };
  }, [voiceSettings.includedVoicesForRandomization, updateVoiceSetting]);

  // Toggle voice inclusion
  const toggleVoiceInclusion = (voiceName: string) => {
    // Update local state
    setIncludedVoices(prev => {
      const newIncludedVoices = prev.includes(voiceName)
        ? prev.filter(name => name !== voiceName)
        : [...prev, voiceName];

      // Also update the speech service directly for immediate effect
      speechService.getOptions().then(options => {
        speechService.setOptions({
          ...options,
          includedVoicesForRandomization: newIncludedVoices
        });
      });

      return newIncludedVoices;
    });
  };

  // Select all voices
  const selectAllVoices = () => {
    const allVoiceNames = voices.map(voice => voice.name);
    setIncludedVoices(allVoiceNames);

    // Also update the speech service directly for immediate effect
    speechService.getOptions().then(options => {
      speechService.setOptions({
        ...options,
        includedVoicesForRandomization: allVoiceNames
      });
      toast.info(`Selected all ${allVoiceNames.length} voices for randomization`);
    });
  };

  // Deselect all voices
  const deselectAllVoices = () => {
    setIncludedVoices([]);

    // Also update the speech service directly for immediate effect
    speechService.getOptions().then(options => {
      speechService.setOptions({
        ...options,
        includedVoicesForRandomization: []
      });
      toast.info('Cleared voice selection for randomization');
    });
  };

  // Preview a voice
  const previewVoice = (voice: SpeechSynthesisVoice) => {
    speechService.testVoice(
      voice,
      voiceSettings.rate || 1,
      voiceSettings.pitch || 1,
      voiceSettings.volume || 1
    );
  };

  // Test voice randomization
  const testRandomization = () => {
    // Get current options
    speechService.getOptions().then(options => {
      // Make sure randomization is enabled for the test
      const testOptions = {
        ...options,
        randomizeVoice: true,
        // Use the current included voices if any are selected, otherwise use all voices
        includedVoicesForRandomization: includedVoices.length > 0
          ? includedVoices
          : voices.map(v => v.name)
      };

      // Apply the test options
      speechService.setOptions(testOptions);

      // Speak test messages with a delay between them to demonstrate different voices
      speechService.speak("Testing voice randomization, message one");

      // Speak another message after a delay to demonstrate a different voice
      setTimeout(() => {
        speechService.speak("Testing voice randomization, message two");
      }, 2500);

      // Restore original randomization setting after the test
      setTimeout(() => {
        speechService.setOptions({
          ...testOptions,
          randomizeVoice: randomizeVoice
        });

        // Show a toast with the result
        if (!randomizeVoice) {
          toast.info("Test complete. Voice randomization is currently disabled.");
        }
      }, 5000);
    });
  };

  // Save settings
  const handleSave = async () => {
    try {
      // Update the context with all the local changes
      updateVoiceSetting('randomizeVoice', randomizeVoice);
      updateVoiceSetting('includedVoicesForRandomization', includedVoices);

      // Get current options to ensure we have all settings
      const currentOptions = await speechService.getOptions();

      // Create updated options
      const updatedOptions = {
        ...currentOptions,
        randomizeVoice: randomizeVoice,
        includedVoicesForRandomization: includedVoices,
        // Clear excluded voices to avoid conflicts
        excludedVoicesForRandomization: []
      };

      // First update the speech service directly
      speechService.setOptions(updatedOptions);

      // Then save the settings for persistence
      await speechService.saveSettings(updatedOptions);

      // Save to the settings context for persistence
      await saveVoiceSettings();

      // Show success message
      toast.success('Voice randomization settings saved');

      // Test the randomization immediately to verify it works
      if (randomizeVoice) {
        setTimeout(() => {
          speechService.speak("Voice randomization has been enabled and saved");
        }, 500);
      }
    } catch (error) {
      console.error('Error saving voice settings:', error);
      toast.error('Failed to save randomization settings');
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
          <h2 className="font-medium">Voice Randomization</h2>
        </div>
      </div>

      {/* Randomization Controls */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          <div className="space-y-3 bg-card/30 p-4 rounded-lg border border-border/50">
            <div className="flex items-center justify-between">
              <Label htmlFor="randomize" className="text-sm font-medium flex items-center">
                <RefreshCw className="h-4 w-4 mr-2 text-primary" />
                Randomize Voice
              </Label>
              <div className="flex items-center">
                <Button
                  variant={randomizeVoice ? "default" : "outline"}
                  size="sm"
                  className={`h-8 rounded-md text-xs ${randomizeVoice ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                  onClick={() => {
                    const newValue = !randomizeVoice;
                    setRandomizeVoice(newValue);

                    // Also update the speech service directly for immediate effect
                    speechService.getOptions().then(options => {
                      speechService.setOptions({
                        ...options,
                        randomizeVoice: newValue
                      });

                      // Show feedback
                      toast.info(newValue ? 'Voice randomization enabled' : 'Voice randomization disabled');

                      // Test immediately if enabled
                      if (newValue) {
                        setTimeout(() => {
                          speechService.speak("Voice randomization has been enabled");
                        }, 500);
                      }
                    });
                  }}
                >
                  {randomizeVoice ? "Enabled" : "Disabled"}
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              When enabled, a random voice will be selected for each message.
            </div>
          </div>

          <div className="space-y-3 bg-card/30 p-4 rounded-lg border border-border/50">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Included Voices</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={selectAllVoices}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={deselectAllVoices}
                >
                  Deselect All
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mb-3">
              Only selected voices will be used for randomization. If none are selected, all voices will be used.
            </div>
            <div className="max-h-[300px] overflow-y-auto pr-2">
              {voices.map((voice) => (
                <div key={voice.name} className="flex items-center justify-between py-2 border-b border-border/30">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id={`include-${voice.name}`}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      checked={includedVoices.includes(voice.name)}
                      onChange={() => toggleVoiceInclusion(voice.name)}
                    />
                    <label htmlFor={`include-${voice.name}`} className="ml-2 text-sm font-medium truncate max-w-[200px]">
                      {voice.name}
                    </label>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full text-muted-foreground hover:text-foreground"
                    onClick={() => previewVoice(voice)}
                  >
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer with Save Button */}
      <div className="border-t border-border/30 p-3 space-y-2">
        <Button
          onClick={handleSave}
          className="w-full h-10 rounded-md flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 shadow-md font-medium"
        >
          <Save className="h-4 w-4" />
          Save Randomization
        </Button>

        <Button
          onClick={testRandomization}
          variant="outline"
          className="w-full h-10 rounded-md flex items-center justify-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Test Randomization
        </Button>
      </div>
    </div>
  );
};

export default VoiceRandomPanel;
