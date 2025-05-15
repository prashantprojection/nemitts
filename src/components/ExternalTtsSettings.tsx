import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import speechService from "@/services/SpeechService";
import externalTtsService from "@/services/speech/externalTts";
import { Save, Play, RefreshCw } from "lucide-react";

const ExternalTtsSettings = () => {
  const [externalTtsEnabled, setExternalTtsEnabled] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [voices, setVoices] = useState<any[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);

  // Function to show notifications in the status bar instead of toast
  const showStatusNotification = (type: 'info' | 'success' | 'error', message: string) => {
    // Dispatch a custom event that the StatusBar component will listen for
    window.dispatchEvent(new CustomEvent('status-notification', {
      detail: { type, message }
    }));
  };

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const options = await speechService.getOptions();
        setExternalTtsEnabled(options.externalTtsEnabled || false);
        setApiKey(options.externalTtsApiKey || "");

        // If API key is set and external TTS is enabled, fetch voices
        if (options.externalTtsEnabled && options.externalTtsApiKey) {
          await fetchVoices(options.externalTtsApiKey);
        }
      } catch (error) {
        console.error("Error loading external TTS settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const fetchVoices = async (key: string) => {
    setIsLoadingVoices(true);
    try {
      // Initialize the service with the API key
      externalTtsService.initialize(key);

      // Fetch available voices
      const availableVoices = await externalTtsService.fetchVoices();
      setVoices(availableVoices);

      // Set default voice if available
      if (availableVoices.length > 0 && !selectedVoiceId) {
        setSelectedVoiceId(availableVoices[0].voice_id);
      }
    } catch (error) {
      console.error("Error fetching voices:", error);
      showStatusNotification('error', "Failed to fetch voices from ElevenLabs");
    } finally {
      setIsLoadingVoices(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const currentOptions = await speechService.getOptions();
      const success = await speechService.saveSettings({
        ...currentOptions,
        externalTtsEnabled,
        externalTtsApiKey: apiKey,
        externalTtsVoiceId: selectedVoiceId
      });

      if (success) {
        showStatusNotification('success', "External TTS settings saved successfully");

        // Initialize the service with the new settings
        if (externalTtsEnabled && apiKey) {
          externalTtsService.initialize(apiKey);
          if (selectedVoiceId) {
            externalTtsService.setVoice(selectedVoiceId);
          }
        }
      }
    } catch (error) {
      console.error("Error saving external TTS settings:", error);
      showStatusNotification('error', "Failed to save external TTS settings");
    } finally {
      setIsSaving(false);
    }
  };

  const testExternalTts = () => {
    if (!externalTtsEnabled || !apiKey) {
      showStatusNotification('error', "External TTS is not enabled or API key is missing");
      return;
    }

    showStatusNotification('info', "Testing external TTS service...");

    // Initialize if needed
    if (!externalTtsService.isInitialized()) {
      externalTtsService.initialize(apiKey);
    }

    // Set the selected voice
    if (selectedVoiceId) {
      externalTtsService.setVoice(selectedVoiceId);
    }

    // Test the service
    externalTtsService.speak("This is a test of the ElevenLabs text to speech service.");
  };

  const handleRefreshVoices = async () => {
    if (!apiKey) {
      showStatusNotification('error', "API key is required to fetch voices");
      return;
    }

    await fetchVoices(apiKey);
  };

  if (isLoading) {
    return <div className="text-center py-6">Loading external TTS settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">External TTS Service</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="external-tts-enabled"
              checked={externalTtsEnabled}
              onCheckedChange={setExternalTtsEnabled}
            />
            <Label htmlFor="external-tts-enabled">
              Enable external TTS service (ElevenLabs)
            </Label>
          </div>

          {externalTtsEnabled && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="Enter your ElevenLabs API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={handleRefreshVoices}
                    disabled={!apiKey || isLoadingVoices}
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingVoices ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your API key is stored securely and only used to access the TTS service.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="voice-select">Voice</Label>
                <Select
                  value={selectedVoiceId}
                  onValueChange={setSelectedVoiceId}
                  disabled={voices.length === 0 || isLoadingVoices}
                >
                  <SelectTrigger id="voice-select" className="w-full">
                    <SelectValue placeholder="Select a voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {voices.map((voice) => (
                      <SelectItem key={voice.voice_id} value={voice.voice_id}>
                        {voice.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {voices.length === 0 && !isLoadingVoices && apiKey && (
                  <p className="text-xs text-muted-foreground">
                    No voices found. Click the refresh button to fetch available voices.
                  </p>
                )}
                {isLoadingVoices && (
                  <p className="text-xs text-muted-foreground">
                    Loading voices...
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={testExternalTts}
                  variant="outline"
                  disabled={!apiKey || !selectedVoiceId}
                  className="flex-1 flex items-center gap-1"
                >
                  <Play className="h-4 w-4" />
                  Test Voice
                </Button>

                <Button
                  onClick={handleSaveSettings}
                  disabled={isSaving || !apiKey}
                  className="flex-1 flex items-center gap-1"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Settings"}
                </Button>
              </div>

              <div className="bg-muted p-4 rounded-md">
                <h4 className="font-medium mb-2">About ElevenLabs TTS</h4>
                <p className="text-sm text-muted-foreground">
                  ElevenLabs provides high-quality, natural-sounding text-to-speech voices.
                  Using an external TTS service will provide better quality than the browser's
                  built-in TTS, but requires an API key and may incur usage costs.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  You can sign up for an ElevenLabs account at{" "}
                  <a
                    href="https://elevenlabs.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    elevenlabs.io
                  </a>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExternalTtsSettings;
