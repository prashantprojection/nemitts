import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import speechService from '@/services/SpeechService';
import { toast } from 'sonner';

interface VoiceSelectionPanelProps {
  onBack?: () => void;
}

const VoiceSelectionPanel = ({ onBack }: VoiceSelectionPanelProps) => {
  const { voiceSettings, updateVoiceSetting, saveVoiceSettings } = useSettings();

  const [selectedVoice, setSelectedVoice] = useState(voiceSettings.voiceName || '');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Update local state when voiceSettings change
  useEffect(() => {
    setSelectedVoice(voiceSettings.voiceName || '');
  }, [voiceSettings]);

  // Load voices
  useEffect(() => {
    // Load available voices
    const loadVoices = () => {
      const availableVoices = speechService.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();

    // Check for Chrome's onvoiceschanged event
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Filter voices based on search query
  const filteredVoices = React.useMemo(() => {
    if (!searchQuery.trim()) return voices;

    const query = searchQuery.toLowerCase();
    return voices.filter(voice =>
      voice.name.toLowerCase().includes(query) ||
      voice.lang.toLowerCase().includes(query)
    );
  }, [voices, searchQuery]);

  // Handle voice selection
  const handleVoiceChange = (voiceName: string) => {
    setSelectedVoice(voiceName);
  };

  // Preview a voice
  const previewVoice = (voice: SpeechSynthesisVoice) => {
    speechService.testVoice(voice, voiceSettings.rate || 1, voiceSettings.pitch || 1, voiceSettings.volume || 1);
  };

  // Save settings
  const handleSave = async () => {
    try {
      // Update the context with the selected voice
      updateVoiceSetting('voiceName', selectedVoice);

      // Update the speech service with the new settings
      await speechService.saveSettings({
        ...voiceSettings,
        voiceName: selectedVoice
      });

      // Save to the settings context for persistence
      await saveVoiceSettings();

      // Show success message
      toast.success('Voice selected successfully');
    } catch (error) {
      console.error('Error saving voice settings:', error);
      toast.error('Failed to save voice selection');
    }
  };

  // Refresh voices list
  const refreshVoices = () => {
    const availableVoices = speechService.getVoices();
    setVoices(availableVoices);
    toast.info(`${availableVoices.length} voices loaded`);
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
          <h2 className="font-medium">Voice Selection</h2>
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="flex items-center p-3 gap-2 border-b border-border/30">
        <div className="relative flex-1">
          <svg className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.3-4.3"></path>
          </svg>
          <Input
            placeholder="Search voices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 h-9 pl-9 bg-muted/30 border-border focus-visible:ring-primary focus-visible:border-primary/50"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={refreshVoices}
          title="Refresh voices"
          className="h-9 w-9 border-border bg-muted/30 hover:bg-muted/50 text-muted-foreground"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Voice List */}
      <ScrollArea className="flex-1">
        {filteredVoices.length > 0 ? (
          filteredVoices.map((voice) => (
            <div
              key={voice.name}
              className={`flex items-center justify-between p-3 border-b border-border/30 cursor-pointer hover:bg-muted/20 transition-colors ${selectedVoice === voice.name ? 'bg-primary/10 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
              onClick={() => handleVoiceChange(voice.name)}
            >
              <div className="overflow-hidden">
                <div className="font-medium truncate">{voice.name}</div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">{voice.lang}</div>
              </div>
              <div className="flex items-center gap-2">
                {selectedVoice === voice.name && (
                  <div className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    Selected
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    previewVoice(voice);
                  }}
                  className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-primary/10"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 px-4">
            <div className="bg-card/50 rounded-lg p-6 inline-block max-w-md mx-auto">
              <div className="mb-3 bg-muted/50 p-3 rounded-full inline-flex">
                <svg className="h-6 w-6 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9v2M11 9v2M15 9v2" />
                </svg>
              </div>
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
      </ScrollArea>
      
      {/* Footer with Save Button */}
      <div className="border-t border-border/30 p-3">
        <Button
          onClick={handleSave}
          className="w-full h-10 rounded-md flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 shadow-md font-medium"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          Save Selection
        </Button>
      </div>
    </div>
  );
};

export default VoiceSelectionPanel;
