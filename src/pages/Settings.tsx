import { useState, useEffect, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { useVoiceSettings } from "@/hooks/useVoiceSettings";
import { useKeyboardShortcuts } from "@/contexts/KeyboardShortcutContext";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Volume2, Sliders, Play, ExternalLink, Keyboard, Tv2 } from "lucide-react";
import twitchAuthService from "@/services/twitch/TwitchAuthService";
import speechService from "@/services/SpeechService";
import VoiceSelector from "@/components/voice-settings/VoiceSelector";
import VoiceSlider from "@/components/voice-settings/VoiceSlider";
import VoiceControls from "@/components/voice-settings/VoiceControls";
// Removed unused imports for SettingsPanel and SettingsGrid

// Import our new settings components
import SettingsSidebar from "@/components/settings/SettingsSidebar";
import SettingsHeader from "@/components/settings/SettingsHeader";
import SettingsContent from "@/components/settings/SettingsContent";

// Lazy load heavy components
const FilterSettingsGrid = lazy(() => import("@/components/filter-settings/FilterSettingsGrid"));
const FilterBlocklistsGrid = lazy(() => import("@/components/filter-settings/FilterBlocklistsGrid"));
const AllowedUsersGrid = lazy(() => import("@/components/filter-settings/AllowedUsersGrid"));
const ExternalTtsSettings = lazy(() => import("@/components/ExternalTtsSettings"));
const HotkeySettings = lazy(() => import("@/components/HotkeySettings"));
const ObsSettings = lazy(() => import("@/components/ObsSettings"));
const TwitchIntegrationSettings = lazy(() => import("@/components/TwitchIntegrationSettings"));
const WordReplacementSettings = lazy(() => import("@/components/filter-settings/WordReplacementSettings"));
const NicknameSettings = lazy(() => import("@/components/filter-settings/NicknameSettings"));
// Removed VoiceRandomizationSettings import - using the right panel version instead

const Settings = () => {
  const [activeTab, setActiveTab] = useState("voice");
  const navigate = useNavigate();
  const { registerShortcut } = useKeyboardShortcuts();

  // Check if user is logged in
  useEffect(() => {
    const authState = twitchAuthService.getAuthState();
    if (!authState.isLoggedIn) {
      // Redirect to main page if not logged in
      navigate('/');
    }
  }, [navigate]);

  // Handle logout
  const handleLogout = () => {
    twitchAuthService.logout();
    navigate('/');
  };

  // Voice settings hook
  const {
    selectedVoice,
    rate,
    pitch,
    volume,
    savedVoice,
    savedRate,
    savedPitch,
    savedVolume,
    isSaving,
    hasChanges,
    showSavedToast,
    handleVoiceChange,
    handleRateChange,
    handlePitchChange,
    handleVolumeChange,
    testVoice,
    saveSettings
  } = useVoiceSettings();

  // Register global hotkeys
  useEffect(() => {
    // Connect/Disconnect from chat
    registerShortcut({
      shortcut: "Ctrl+Shift+C",
      description: "Connect/Disconnect from chat",
      category: "chat",
      callback: () => {
        const twitchTTSElement = document.querySelector('[data-twitch-tts-connect]');
        if (twitchTTSElement) {
          (twitchTTSElement as HTMLButtonElement).click();
        }
      }
    });

    // Skip current message
    registerShortcut({
      shortcut: "Ctrl+S",
      description: "Skip current message",
      category: "playback",
      callback: () => speechService.skipCurrent()
    });

    // Clear queue
    registerShortcut({
      shortcut: "Ctrl+C",
      description: "Clear queue",
      category: "playback",
      callback: () => speechService.stop()
    });

    // Volume controls
    registerShortcut({
      shortcut: "Ctrl+ArrowUp",
      description: "Increase volume",
      category: "volume",
      callback: () => speechService.adjustVolume(0.1)
    });

    registerShortcut({
      shortcut: "Ctrl+ArrowDown",
      description: "Decrease volume",
      category: "volume",
      callback: () => speechService.adjustVolume(-0.1)
    });

    // Rate controls
    registerShortcut({
      shortcut: "Ctrl+ArrowRight",
      description: "Increase speech rate",
      category: "voice",
      callback: () => speechService.adjustRate(0.1)
    });

    registerShortcut({
      shortcut: "Ctrl+ArrowLeft",
      description: "Decrease speech rate",
      category: "voice",
      callback: () => speechService.adjustRate(-0.1)
    });

    // Pitch controls
    registerShortcut({
      shortcut: "Ctrl+Shift+P",
      description: "Increase pitch",
      category: "voice",
      callback: () => handlePitchChange([pitch + 0.1])
    });

    registerShortcut({
      shortcut: "Ctrl+P",
      description: "Decrease pitch",
      category: "voice",
      callback: () => handlePitchChange([pitch - 0.1])
    });

    // Toggle mute
    registerShortcut({
      shortcut: "Ctrl+M",
      description: "Toggle mute",
      category: "playback",
      callback: () => speechService.toggleMute()
    });

    // Show keyboard shortcuts
    registerShortcut({
      shortcut: "Shift+?",
      description: "Show keyboard shortcuts",
      category: "help",
      callback: () => {
        // This is handled by the KeyboardShortcutContext
      }
    });
  }, [registerShortcut]);

  // Function to get content based on active tab
  const getContent = () => {
    // Voice settings content
    if (activeTab === 'voice') {
      return (
        <SettingsContent title="Voice Settings" description="Configure the general voice settings">
          <div className="space-y-6">
            {/* Current Voice Status Panel */}
            <div className="card p-6 border rounded-lg bg-card shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                  <Volume2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-medium">Currently Active General Voice</h3>
                </div>
              </div>

              <div className={`p-3 rounded-md border transition-all duration-300 ${showSavedToast ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'}`}>
                <div className="flex flex-wrap gap-2">
                  {savedVoice ? (
                    <>
                      <Badge variant="secondary" className={`font-medium text-base px-3 py-1 ${showSavedToast ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'}`}>
                        <span className="flex items-center gap-1">
                          {savedVoice}
                        </span>
                      </Badge>
                      <Badge variant="outline" className={`px-3 py-1 ${showSavedToast ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/10' : 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/10'}`}>
                        Rate: {savedRate.toFixed(1)}
                      </Badge>
                      <Badge variant="outline" className={`px-3 py-1 ${showSavedToast ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/10' : 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/10'}`}>
                        Pitch: {savedPitch.toFixed(1)}
                      </Badge>
                      <Badge variant="outline" className={`px-3 py-1 ${showSavedToast ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/10' : 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/10'}`}>
                        Volume: {savedVolume.toFixed(2)}
                      </Badge>
                    </>
                  ) : (
                    <Badge variant="secondary" className="font-medium text-base px-3 py-1 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                      <span className="flex items-center gap-1">
                        Please select a voice to use for TTS
                      </span>
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Voice Selection Panel */}
            <div className="card p-6 border rounded-lg bg-card shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                  <Volume2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-medium">Voice Selection</h3>
                  <p className="text-sm text-muted-foreground truncate" title="Choose a voice for text-to-speech">Choose a voice for text-to-speech</p>
                </div>
              </div>

              <VoiceSelector
                selectedVoice={selectedVoice}
                savedVoice={savedVoice}
                onVoiceChange={handleVoiceChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Voice Adjustment Panel */}
              <div className="card p-6 border rounded-lg bg-card shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                    <Sliders className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium">Voice Adjustments</h3>
                    <p className="text-sm text-muted-foreground truncate" title="Fine-tune the voice parameters">Fine-tune the voice parameters</p>
                  </div>
                </div>

                <div className="space-y-4">
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
                </div>
              </div>

              {/* Voice Note Panel */}
              <div className="card p-6 border rounded-lg bg-card shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium">Voice Usage Note</h3>
                    <p className="text-sm text-muted-foreground truncate" title="Important information about voice settings">Important information about voice settings</p>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <p className="text-sm text-blue-800 dark:text-blue-300 line-clamp-2" title="This general voice will be used for all viewers who don't have a specific voice assigned in the User Voices tab.">
                    <strong>Note:</strong> This general voice will be used for all viewers who don't have a specific voice assigned in the User Voices tab.
                  </p>
                </div>
              </div>
            </div>

            {/* Voice Controls Panel */}
            <div className="card p-6 border rounded-lg bg-card shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                  <Play className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-medium">Voice Controls</h3>
                  <p className="text-sm text-muted-foreground truncate" title="Test and save your voice settings">Test and save your voice settings</p>
                </div>
              </div>

              <VoiceControls
                onTestVoice={testVoice}
                onSaveSettings={saveSettings}
                isSaving={isSaving}
                hasChanges={hasChanges}
                showSavedToast={showSavedToast}
              />
            </div>
          </div>
        </SettingsContent>
      );
    }

    // External TTS services content
    else if (activeTab === 'external-tts') {
      return (
        <SettingsContent title="External TTS Services" description="Configure external text-to-speech services">
          <div className="space-y-6">
            <div className="card p-6 border rounded-lg bg-card shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                  <ExternalLink className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-medium">External TTS Services</h3>
                  <p className="text-sm text-muted-foreground">Configure external text-to-speech services</p>
                </div>
              </div>

              <ExternalTtsSettings />
            </div>
          </div>
        </SettingsContent>
      );
    }

    // Message filters content
    else if (activeTab === 'message-filters') {
      return (
        <SettingsContent title="Message Filters" description="Configure which messages should be read aloud">
          <FilterSettingsGrid />
        </SettingsContent>
      );
    }

    // Blocklists content
    else if (activeTab === 'blocklists') {
      return (
        <SettingsContent title="Blocklists" description="Manage blocked users and words">
          <FilterBlocklistsGrid />
        </SettingsContent>
      );
    }

    // Voice randomization is now handled in the right panel only

    // Allowed users content
    else if (activeTab === 'allowed-users') {
      return (
        <SettingsContent title="Allowed Users" description="Control which users can trigger TTS">
          <AllowedUsersGrid />
        </SettingsContent>
      );
    }

    // Word Replacements content
    else if (activeTab === 'word-replacements') {
      return (
        <SettingsContent title="Word Replacements" description="Replace chat abbreviations with full words for clearer TTS">
          <WordReplacementSettings />
        </SettingsContent>
      );
    }

    // Nicknames content
    else if (activeTab === 'nicknames') {
      return (
        <SettingsContent title="Nicknames" description="Configure nicknames for users">
          <NicknameSettings />
        </SettingsContent>
      );
    }

    // Integration subcategories
    else if (activeTab === 'integrations-twitch') {
      return (
        <SettingsContent title="Twitch Integration" description="Connect your Twitch channel points and bits to TTS">
          <div className="space-y-6">
            <div className="card p-6 border rounded-lg bg-card shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-purple-500">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4.3 3H21v11.7l-4.7 4.7h-3.9l-2.5 2.4H7v-2.4H3V6.2L4.3 3zM5 17.4h4v2.4h.095l2.5-2.4h3.877L19 13.574V5H5v12.4zM15 8h2v4.7h-2V8zm0 0M9 8h2v4.7H9V8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-medium">Twitch Integration</h3>
                  <p className="text-sm text-muted-foreground">Connect your Twitch channel points and bits to TTS</p>
                </div>
              </div>

              <TwitchIntegrationSettings />
            </div>
          </div>
        </SettingsContent>
      );
    }
    else if (activeTab === 'integrations-keyboard') {
      return (
        <SettingsContent title="Keyboard Shortcuts" description="Configure keyboard shortcuts for quick control">
          <div className="space-y-6">
            <div className="card p-6 border rounded-lg bg-card shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                  <Keyboard className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-medium">Keyboard Shortcuts</h3>
                  <p className="text-sm text-muted-foreground">Configure keyboard shortcuts for quick control</p>
                </div>
              </div>

              <HotkeySettings />
            </div>
          </div>
        </SettingsContent>
      );
    }
    else if (activeTab === 'integrations-obs') {
      return (
        <SettingsContent title="OBS Integration" description="Configure the OBS browser source overlay">
          <div className="space-y-6">
            <div className="card p-6 border rounded-lg bg-card shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                  <Tv2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-medium">OBS Integration</h3>
                  <p className="text-sm text-muted-foreground">Configure the OBS browser source overlay</p>
                </div>
              </div>

              <ObsSettings />
            </div>
          </div>
        </SettingsContent>
      );
    }

    // Default integrations overview
    else if (activeTab === 'integrations') {
      return (
        <SettingsContent title="Integrations" description="Configure integrations with other services">
          <div className="mb-4 inline-flex items-center gap-2">
            <span className="text-xs px-1.5 py-0.5 rounded-sm bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
              Experimental
            </span>
            <span className="text-sm text-muted-foreground">These features are still in development and may change</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6 hover:bg-muted/50 cursor-pointer transition-colors border-border/40" onClick={() => setActiveTab('integrations-twitch')}>
              <CardTitle className="text-base font-medium mb-2 flex items-center gap-2">
                <svg className="h-5 w-5 text-purple-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.3 3H21v11.7l-4.7 4.7h-3.9l-2.5 2.4H7v-2.4H3V6.2L4.3 3zM5 17.4h4v2.4h.095l2.5-2.4h3.877L19 13.574V5H5v12.4zM15 8h2v4.7h-2V8zm0 0M9 8h2v4.7H9V8z" />
                </svg>
                Twitch Integration
              </CardTitle>
              <CardDescription>Connect your Twitch channel points and bits to TTS</CardDescription>
            </Card>

            <Card className="p-6 hover:bg-muted/50 cursor-pointer transition-colors border-border/40" onClick={() => setActiveTab('integrations-keyboard')}>
              <CardTitle className="text-base font-medium mb-2 flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-blue-500" />
                Keyboard Shortcuts
              </CardTitle>
              <CardDescription>Configure keyboard shortcuts for quick control</CardDescription>
            </Card>

            <Card className="p-6 hover:bg-muted/50 cursor-pointer transition-colors border-border/40" onClick={() => setActiveTab('integrations-obs')}>
              <CardTitle className="text-base font-medium mb-2 flex items-center gap-2">
                <Tv2 className="h-5 w-5 text-green-500" />
                OBS Integration
              </CardTitle>
              <CardDescription>Configure the OBS browser source overlay</CardDescription>
            </Card>
          </div>
        </SettingsContent>
      );
    }

    // Default to voice settings if no tab is selected
    setActiveTab('voice');
    return (
      <SettingsContent title="Settings" description="Configure your TTS Reader">
        <div className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">Please select a setting from the sidebar</p>
        </div>
      </SettingsContent>
    );
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-background">
      {/* Modern App Header */}
      <SettingsHeader title="Settings" onLogout={handleLogout} />

      {/* Main content with sidebar and content area */}
      <div className="flex-1 flex overflow-hidden">
        <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 overflow-hidden">
          {getContent()}
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between text-xs text-muted-foreground h-6 border-t bg-muted/30">
        <p className="px-2">Settings are stored locally on your device.</p>
        <div className="flex items-center h-full">
          <span className="px-2 border-l h-full flex items-center">v1.0.0</span>
        </div>
      </div>
    </div>
  );
};

export default Settings;
