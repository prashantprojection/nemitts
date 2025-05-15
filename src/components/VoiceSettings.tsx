
import { useState, useEffect } from "react";
import { useVoiceSettings } from "@/hooks/useVoiceSettings";
import { useHotkeys } from "@/hooks/useHotkeys";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import VoiceSelector from "./voice-settings/VoiceSelector";
import VoiceSlider from "./voice-settings/VoiceSlider";
import VoiceControls from "./voice-settings/VoiceControls";
import FilterSettings from "./FilterSettings";
import UserVoiceAssignments from "./UserVoiceAssignments";
import ExternalTtsSettings from "./ExternalTtsSettings";
import QueueDisplay from "./QueueDisplay";
import HotkeySettings from "./HotkeySettings";
// Stream Deck settings removed
import ObsSettings from "./ObsSettings";
// Preset components removed
import speechService from "@/services/SpeechService";
import TabContainer from "./layout/TabContainer";
import Section from "./layout/Section";

const VoiceSettings = () => {
  const {
    // Current settings (being edited)
    selectedVoice,
    rate,
    pitch,
    volume,

    // Saved settings (currently applied)
    savedVoice,
    savedRate,
    savedPitch,
    savedVolume,

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
    testVoice,
    saveSettings
  } = useVoiceSettings();

  const [hotkeysEnabled, setHotkeysEnabled] = useState(false);

  // Set up hotkeys
  const { getHotkeysList } = useHotkeys([
    {
      key: "c",
      ctrlKey: true,
      shiftKey: true,
      callback: () => {
        if (hotkeysEnabled) {
          const twitchTTSElement = document.querySelector('[data-twitch-tts-connect]');
          if (twitchTTSElement) {
            (twitchTTSElement as HTMLButtonElement).click();
          }
        }
      },
      description: "Connect/Disconnect from chat"
    },
    {
      key: "s",
      ctrlKey: true,
      callback: () => {
        if (hotkeysEnabled) speechService.skipCurrent();
      },
      description: "Skip current message"
    },
    {
      key: "c",
      ctrlKey: true,
      callback: () => {
        if (hotkeysEnabled) speechService.stop();
      },
      description: "Clear queue"
    }
  ]);

  // Load hotkey settings
  useEffect(() => {
    const enabled = localStorage.getItem('hotkeys-enabled') === 'true';
    setHotkeysEnabled(enabled);
  }, []);

  if (isLoading) {
    return <div className="text-center py-6">Loading voice settings...</div>;
  }

  // Define the main tabs
  const mainTabs = [
    {
      value: "voice",
      label: "Voice",
      content: (
        <Section title="Default Voice Settings" description="Configure the default voice settings used for all viewers without specific voice assignments">
          <div className="space-y-6">
            <div className="card p-6 border rounded-lg bg-card shadow-sm max-w-4xl mx-auto">
              {/* Show currently saved voice */}
              {savedVoice && (
                <div className={`mb-4 p-3 rounded-md border transition-all duration-300 ${showSavedToast ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-muted/30'}`}>
                  <div className="text-sm font-medium mb-1 flex items-center">
                    {showSavedToast && <Check className="h-4 w-4 mr-1 text-green-600" />}
                    Currently Active Default Voice:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className={`font-medium ${showSavedToast ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : ''}`}>
                      <span className="flex items-center gap-1">
                        Voice: {savedVoice}
                      </span>
                    </Badge>
                    <Badge variant="outline" className={showSavedToast ? 'border-green-200 dark:border-green-800' : ''}>
                      Rate: {savedRate.toFixed(1)}
                    </Badge>
                    <Badge variant="outline" className={showSavedToast ? 'border-green-200 dark:border-green-800' : ''}>
                      Pitch: {savedPitch.toFixed(1)}
                    </Badge>
                    <Badge variant="outline" className={showSavedToast ? 'border-green-200 dark:border-green-800' : ''}>
                      Volume: {savedVolume.toFixed(2)}
                    </Badge>
                  </div>
                </div>
              )}

              <VoiceSelector
                selectedVoice={selectedVoice}
                savedVoice={savedVoice}
                onVoiceChange={handleVoiceChange}
              />

              <VoiceSlider
                id="rate-slider"
                label="Rate"
                value={rate}
                min={0.1}
                max={2}
                step={0.1}
                onChange={handleRateChange}
              />

              <VoiceSlider
                id="pitch-slider"
                label="Pitch"
                value={pitch}
                min={0.1}
                max={2}
                step={0.1}
                onChange={handlePitchChange}
              />

              <VoiceSlider
                id="volume-slider"
                label="Volume"
                value={volume}
                min={0}
                max={1}
                step={0.01}
                formatValue={(val) => `${(val * 100).toFixed(0)}%`}
                onChange={handleVolumeChange}
              />

              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md mt-6 mb-2">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Note:</strong> This default voice will be used for all viewers who don't have a specific voice assigned in the User Voices tab.
                </p>
              </div>

              <VoiceControls
                onTestVoice={testVoice}
                onSaveSettings={saveSettings}
                isSaving={isSaving}
                hasChanges={hasChanges}
                showSavedToast={showSavedToast}
              />
            </div>

            {/* Preset component removed */}
          </div>
        </Section>
      )
    },
    {
      value: "filters",
      label: "Filters",
      content: (
        <Section title="Message Filters" description="Configure which messages should be read aloud">
          <div className="space-y-6">
            <FilterSettings />
          </div>
        </Section>
      )
    },
    {
      value: "users",
      label: "User Voices",
      content: (
        <Section title="User Voice Assignments" description="Assign different voices to specific users">
          <UserVoiceAssignments />
        </Section>
      )
    },
    {
      value: "external",
      label: "External TTS",
      content: (
        <Section title="External TTS Services" description="Configure external TTS services for higher quality voices">
          <ExternalTtsSettings />
        </Section>
      )
    }
  ];

  // Define the streaming tabs
  const streamingTabs = [
    {
      value: "queue",
      label: "Queue",
      content: (
        <Section title="Message Queue" description="View and manage the current TTS message queue">
          <QueueDisplay />
        </Section>
      )
    },
    {
      value: "hotkeys",
      label: "Hotkeys",
      content: (
        <Section title="Keyboard Shortcuts" description="Configure keyboard shortcuts for quick control">
          <HotkeySettings
            hotkeys={getHotkeysList()}
            enabled={hotkeysEnabled}
            onToggle={setHotkeysEnabled}
          />
        </Section>
      )
    },
    // Stream Deck tab removed
    {
      value: "obs",
      label: "OBS Overlay",
      content: (
        <Section title="OBS Integration" description="Configure the OBS browser source overlay">
          <ObsSettings />
        </Section>
      )
    }
  ];

  return (
    <div className="space-y-8">
      <Section title="Voice & Message Settings">
        <TabContainer tabs={mainTabs} defaultValue="voice" />
      </Section>

      <Section title="Streaming Integration">
        <TabContainer tabs={streamingTabs} defaultValue="queue" />
      </Section>
    </div>
  );
};

export default VoiceSettings;
