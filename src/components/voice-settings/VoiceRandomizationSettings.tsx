import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shuffle, X, Plus, Volume2, Info } from "lucide-react";
import { useSettings } from '@/contexts/SettingsContext';
import speechService from '@/services/SpeechService';
import { toast } from 'sonner';

const VoiceRandomizationSettings = () => {
  const { voiceSettings, updateVoiceSetting, saveVoiceSettings } = useSettings();

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [randomizeVoice, setRandomizeVoice] = useState(voiceSettings.randomizeVoice || false);
  const [includedVoices, setIncludedVoices] = useState<string[]>(voiceSettings.includedVoicesForRandomization || []);
  const [excludedVoices, setExcludedVoices] = useState<string[]>(voiceSettings.excludedVoicesForRandomization || []);
  const [searchQuery, setSearchQuery] = useState("");

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = speechService.getVoices();
      console.log(`Loaded ${availableVoices.length} voices`);
      setVoices(availableVoices);
    };

    // Initial load
    loadVoices();

    // Check for Chrome's onvoiceschanged event
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Set up a timer to retry loading voices if none were found initially
    // This helps in browsers where voices might load asynchronously
    const retryTimer = setTimeout(() => {
      if (voices.length === 0) {
        console.log('No voices loaded initially, retrying...');
        loadVoices();
      }
    }, 1000);

    return () => clearTimeout(retryTimer);
  }, [voices.length]);

  // Update local state when voiceSettings change
  useEffect(() => {
    setRandomizeVoice(voiceSettings.randomizeVoice || false);
    setIncludedVoices(voiceSettings.includedVoicesForRandomization || []);
    setExcludedVoices(voiceSettings.excludedVoicesForRandomization || []);
  }, [voiceSettings]);

  // Filter voices based on search query
  const filteredVoices = React.useMemo(() => {
    if (!searchQuery.trim()) return voices;

    const query = searchQuery.toLowerCase();
    return voices.filter(voice =>
      voice.name.toLowerCase().includes(query) ||
      voice.lang.toLowerCase().includes(query)
    );
  }, [voices, searchQuery]);

  // Handle randomize voice toggle - immediately save the setting
  const handleRandomizeVoiceChange = async (checked: boolean) => {
    console.log(`Setting randomizeVoice to ${checked}`);
    setRandomizeVoice(checked);

    try {
      // Update settings in context
      updateVoiceSetting('randomizeVoice', checked);

      // Get current speech options
      const currentOptions = await speechService.getOptions();

      // Update speech service directly with all randomization settings
      speechService.setOptions({
        ...currentOptions,
        randomizeVoice: checked,
        includedVoicesForRandomization: includedVoices,
        excludedVoicesForRandomization: excludedVoices
      });

      // Also save settings for persistence
      await speechService.saveSettings({
        randomizeVoice: checked,
        includedVoicesForRandomization: includedVoices,
        excludedVoicesForRandomization: excludedVoices
      });

      // Save to persistent storage
      await saveVoiceSettings();

      // Show feedback to user
      if (checked) {
        toast.success('Voice randomization enabled');
      } else {
        toast.info('Voice randomization disabled');
      }

      // Log the current state for debugging
      console.log('Current randomization settings:', {
        randomizeVoice: checked,
        includedVoices: includedVoices.length,
        excludedVoices: excludedVoices.length
      });
    } catch (error) {
      console.error('Error updating randomize voice setting:', error);
      toast.error('Failed to update voice randomization setting');
    }
  };

  // Add voice to included list and save immediately
  const addToIncludedVoices = async (voiceName: string) => {
    if (includedVoices.includes(voiceName)) return;

    let newIncludedVoices = [...includedVoices];
    let newExcludedVoices = [...excludedVoices];

    if (excludedVoices.includes(voiceName)) {
      // Remove from excluded if it's there
      newExcludedVoices = newExcludedVoices.filter(name => name !== voiceName);
      setExcludedVoices(newExcludedVoices);
    }

    // Add to included list
    newIncludedVoices = [...newIncludedVoices, voiceName];
    setIncludedVoices(newIncludedVoices);

    // Save changes
    try {
      // Update settings in context
      updateVoiceSetting('includedVoicesForRandomization', newIncludedVoices);
      updateVoiceSetting('excludedVoicesForRandomization', newExcludedVoices);

      // Get current speech options
      const currentOptions = await speechService.getOptions();

      // Update speech service directly
      speechService.setOptions({
        ...currentOptions,
        randomizeVoice: randomizeVoice,
        includedVoicesForRandomization: newIncludedVoices,
        excludedVoicesForRandomization: newExcludedVoices
      });

      // Also save settings for persistence
      await speechService.saveSettings({
        randomizeVoice: randomizeVoice,
        includedVoicesForRandomization: newIncludedVoices,
        excludedVoicesForRandomization: newExcludedVoices
      });

      // Save to persistent storage
      await saveVoiceSettings();

      console.log('Updated included voices:', {
        randomizeVoice,
        includedVoices: newIncludedVoices.length,
        excludedVoices: newExcludedVoices.length
      });
    } catch (error) {
      console.error('Error saving voice lists:', error);
    }
  };

  // Add voice to excluded list and save immediately
  const addToExcludedVoices = async (voiceName: string) => {
    if (excludedVoices.includes(voiceName)) return;

    let newIncludedVoices = [...includedVoices];
    let newExcludedVoices = [...excludedVoices];

    if (includedVoices.includes(voiceName)) {
      // Remove from included if it's there
      newIncludedVoices = newIncludedVoices.filter(name => name !== voiceName);
      setIncludedVoices(newIncludedVoices);
    }

    // Add to excluded list
    newExcludedVoices = [...newExcludedVoices, voiceName];
    setExcludedVoices(newExcludedVoices);

    // Save changes
    try {
      // Update settings in context
      updateVoiceSetting('includedVoicesForRandomization', newIncludedVoices);
      updateVoiceSetting('excludedVoicesForRandomization', newExcludedVoices);

      // Get current speech options
      const currentOptions = await speechService.getOptions();

      // Update speech service directly
      speechService.setOptions({
        ...currentOptions,
        randomizeVoice: randomizeVoice,
        includedVoicesForRandomization: newIncludedVoices,
        excludedVoicesForRandomization: newExcludedVoices
      });

      // Also save settings for persistence
      await speechService.saveSettings({
        randomizeVoice: randomizeVoice,
        includedVoicesForRandomization: newIncludedVoices,
        excludedVoicesForRandomization: newExcludedVoices
      });

      // Save to persistent storage
      await saveVoiceSettings();

      console.log('Updated excluded voices:', {
        randomizeVoice,
        includedVoices: newIncludedVoices.length,
        excludedVoices: newExcludedVoices.length
      });
    } catch (error) {
      console.error('Error saving voice lists:', error);
    }
  };

  // Remove voice from included list and save immediately
  const removeFromIncludedVoices = async (voiceName: string) => {
    const newIncludedVoices = includedVoices.filter(name => name !== voiceName);
    setIncludedVoices(newIncludedVoices);

    // Save changes
    try {
      // Update settings in context
      updateVoiceSetting('includedVoicesForRandomization', newIncludedVoices);

      // Get current speech options
      const currentOptions = await speechService.getOptions();

      // Update speech service directly
      speechService.setOptions({
        ...currentOptions,
        randomizeVoice: randomizeVoice,
        includedVoicesForRandomization: newIncludedVoices
      });

      // Also save settings for persistence
      await speechService.saveSettings({
        randomizeVoice: randomizeVoice,
        includedVoicesForRandomization: newIncludedVoices
      });

      // Save to persistent storage
      await saveVoiceSettings();

      console.log('Removed from included voices:', {
        randomizeVoice,
        includedVoices: newIncludedVoices.length
      });
    } catch (error) {
      console.error('Error saving voice lists:', error);
    }
  };

  // Remove voice from excluded list and save immediately
  const removeFromExcludedVoices = async (voiceName: string) => {
    const newExcludedVoices = excludedVoices.filter(name => name !== voiceName);
    setExcludedVoices(newExcludedVoices);

    // Save changes
    try {
      // Update settings in context
      updateVoiceSetting('excludedVoicesForRandomization', newExcludedVoices);

      // Get current speech options
      const currentOptions = await speechService.getOptions();

      // Update speech service directly
      speechService.setOptions({
        ...currentOptions,
        randomizeVoice: randomizeVoice,
        excludedVoicesForRandomization: newExcludedVoices
      });

      // Also save settings for persistence
      await speechService.saveSettings({
        randomizeVoice: randomizeVoice,
        excludedVoicesForRandomization: newExcludedVoices
      });

      // Save to persistent storage
      await saveVoiceSettings();

      console.log('Removed from excluded voices:', {
        randomizeVoice,
        excludedVoices: newExcludedVoices.length
      });
    } catch (error) {
      console.error('Error saving voice lists:', error);
    }
  };

  // Preview a voice
  const previewVoice = (voice: SpeechSynthesisVoice) => {
    speechService.testVoice(voice);
  };

  // Test randomization
  const testRandomVoice = () => {
    // Get available voices for randomization
    let availableVoices = [...voices];
    let selectionMethod = "all available voices";

    console.log(`Total available voices: ${availableVoices.length}`);
    console.log(`Included voices: ${includedVoices.length}`);
    console.log(`Excluded voices: ${excludedVoices.length}`);

    // If we have included voices, only use those
    if (includedVoices.length > 0) {
      availableVoices = availableVoices.filter(voice => includedVoices.includes(voice.name));
      selectionMethod = "included voices list";
      console.log(`Filtered to ${availableVoices.length} included voices`);
    }
    // Otherwise, if we have excluded voices, filter those out
    else if (excludedVoices.length > 0) {
      availableVoices = availableVoices.filter(voice => !excludedVoices.includes(voice.name));
      selectionMethod = "all voices except excluded ones";
      console.log(`Filtered to ${availableVoices.length} voices after excluding ${excludedVoices.length} voices`);
    }
    else {
      console.log('Using all available voices for randomization');
    }

    // If no voices are available after filtering, use all voices
    if (availableVoices.length === 0) {
      availableVoices = voices;
      toast.warning("No voices available after filtering. Using all voices instead.");
      selectionMethod = "all available voices (fallback)";
      console.log('No voices available after filtering, falling back to all voices');
    }

    console.log(`Final voice pool for randomization: ${availableVoices.length} voices`);

    // Select a random voice
    const randomIndex = Math.floor(Math.random() * availableVoices.length);
    const randomVoice = availableVoices[randomIndex];

    // Test the voice
    speechService.testVoice(randomVoice);
    toast.info(`Testing random voice: ${randomVoice.name} (selected from ${selectionMethod}, ${availableVoices.length} voices available)`);
    console.log(`Selected random voice: ${randomVoice.name}`);
  };

  // We don't need a separate save function as all changes are saved immediately

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shuffle className="h-5 w-5 text-primary" />
            <CardTitle>Voice Randomization</CardTitle>
          </div>
          <CardDescription>Configure voice randomization settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main toggle */}
          <div className="flex items-center justify-between bg-card/30 p-4 rounded-lg border border-border/50">
            <div className="flex items-center">
              <Shuffle className="h-4 w-4 mr-2 text-primary" />
              <Label htmlFor="randomize-voice" className="text-sm font-medium cursor-pointer">
                Randomize Voice
              </Label>
            </div>
            <Switch
              id="randomize-voice"
              checked={randomizeVoice}
              onCheckedChange={handleRandomizeVoiceChange}
            />
          </div>

          {randomizeVoice && (
            <>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-300">
                  <Info className="h-4 w-4" />
                  <div>
                    <p className="mb-2">
                      <strong>How Voice Randomization Works:</strong>
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Each message will be read with a randomly selected voice</li>
                      <li>You can include specific voices to randomize from</li>
                      <li>You can exclude voices you don't want to use</li>
                      <li>If you include voices, only those will be used</li>
                      <li>If you exclude voices, all other voices will be used</li>
                      <li>If both lists are empty, all available voices will be used</li>
                      <li>All changes are saved automatically</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Included Voices */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Included Voices</h3>
                  <div className="min-h-[100px] max-h-[200px] border rounded-md p-2 bg-muted/20">
                    <ScrollArea className="h-full w-full">
                      {includedVoices.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {includedVoices.map(voiceName => (
                            <Badge
                              key={voiceName}
                              variant="secondary"
                              className="flex items-center gap-1"
                            >
                              {voiceName}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 p-0 hover:bg-transparent"
                                onClick={() => removeFromIncludedVoices(voiceName)}
                                title="Remove voice"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground w-full text-center py-2">
                          No voices included. Add voices from the list below.
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </div>

                {/* Excluded Voices */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Excluded Voices</h3>
                  <div className="min-h-[100px] max-h-[200px] border rounded-md p-2 bg-muted/20">
                    <ScrollArea className="h-full w-full">
                      {excludedVoices.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {excludedVoices.map(voiceName => (
                            <Badge
                              key={voiceName}
                              variant="secondary"
                              className="flex items-center gap-1"
                            >
                              {voiceName}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 p-0 hover:bg-transparent"
                                onClick={() => removeFromExcludedVoices(voiceName)}
                                title="Remove voice"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground w-full text-center py-2">
                          No voices excluded. Add voices from the list below.
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              </div>

              {/* Voice Search */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Available Voices</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testRandomVoice}
                    className="flex items-center gap-1"
                  >
                    <Shuffle className="h-3 w-3" />
                    <span>Test Random Voice</span>
                  </Button>
                </div>
                <div className="relative">
                  <svg className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.3-4.3"></path>
                  </svg>
                  <Input
                    placeholder="Search voices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Voice List */}
                <div className="border rounded-md overflow-hidden">
                  <div className="max-h-[300px] overflow-y-auto">
                    {filteredVoices.length > 0 ? (
                      filteredVoices.map((voice) => (
                        <div
                          key={voice.name}
                          className={`flex items-center justify-between p-3 border-b border-border/30 hover:bg-muted/20 transition-colors ${
                            includedVoices.includes(voice.name)
                              ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-l-green-500'
                              : excludedVoices.includes(voice.name)
                                ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-l-red-500'
                                : 'border-l-4 border-l-transparent'
                          }`}
                        >
                          <div className="overflow-hidden">
                            <div className="font-medium truncate">{voice.name}</div>
                            <div className="text-xs text-muted-foreground truncate mt-0.5">{voice.lang}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {includedVoices.includes(voice.name) ? (
                              <Badge variant="outline" className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800">
                                Included
                              </Badge>
                            ) : excludedVoices.includes(voice.name) ? (
                              <Badge variant="outline" className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800">
                                Excluded
                              </Badge>
                            ) : null}
                            <div className="flex">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/30"
                                onClick={() => addToIncludedVoices(voice.name)}
                                title="Include voice"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30"
                                onClick={() => addToExcludedVoices(voice.name)}
                                title="Exclude voice"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => previewVoice(voice)}
                                title="Preview voice"
                              >
                                <Volume2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 px-4">
                        <div className="bg-card/50 rounded-lg p-6 inline-block max-w-md mx-auto">
                          <p className="text-foreground font-medium">
                            {searchQuery ? "No voices found matching your search" : "No voices available"}
                          </p>
                          {searchQuery && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Try a different search term or clear the search field
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* No save button needed as all changes are saved automatically */}
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceRandomizationSettings;
