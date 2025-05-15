import { useState, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Search, Volume2, ChevronLeft, ChevronRight, Globe } from "lucide-react";
import speechService from "@/services/SpeechService";

interface VoiceSelectorProps {
  selectedVoice: string;
  savedVoice?: string; // Currently active voice
  onVoiceChange: (value: string) => void;
}

interface VoiceGroup {
  lang: string;
  name: string;
  voices: SpeechSynthesisVoice[];
}

const VoiceSelector = ({ selectedVoice, savedVoice, onVoiceChange }: VoiceSelectorProps) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedVoiceObj, setSelectedVoiceObj] = useState<SpeechSynthesisVoice | null>(null);
  const [filterType, setFilterType] = useState<"language" | "country">("language");

  useEffect(() => {
    // Get available voices
    const loadVoices = () => {
      const availableVoices = speechService.getVoices();
      setVoices(availableVoices);

      // Find the currently selected voice object
      const currentVoice = availableVoices.find(v => v.name === selectedVoice);
      if (currentVoice) {
        setSelectedVoiceObj(currentVoice);
      }
    };

    loadVoices();

    // Check for Chrome's onvoiceschanged event
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [selectedVoice]);

  // Update when savedVoice changes (to reflect changes in real-time)
  useEffect(() => {
    // Force a re-render when savedVoice changes
    if (savedVoice) {
      // This will update the UI to show the new active voice
      const voiceElements = document.querySelectorAll(`[data-voice-name]`);
      voiceElements.forEach(el => {
        if (el instanceof HTMLElement) {
          const voiceName = el.dataset.voiceName;
          if (voiceName === savedVoice) {
            // Add a temporary highlight class
            el.classList.add('highlight-saved');
            // Remove it after animation completes
            setTimeout(() => {
              el.classList.remove('highlight-saved');
            }, 2000);
          }
        }
      });
    }
  }, [savedVoice]);

  // Group voices by language or country
  const voiceGroups = useMemo(() => {
    const groups: Record<string, VoiceGroup> = {};

    // Filter voices based on search query
    const filteredVoices = voices.filter(voice => {
      const searchLower = searchQuery.toLowerCase();
      return voice.name.toLowerCase().includes(searchLower) ||
             voice.lang.toLowerCase().includes(searchLower);
    });

    // Group by language or country
    filteredVoices.forEach(voice => {
      let groupCode, groupName;

      if (filterType === "language") {
        // Group by language (e.g., 'en' from 'en-US')
        groupCode = voice.lang.split('-')[0];
        groupName = new Intl.DisplayNames([navigator.language], { type: 'language' }).of(groupCode) || groupCode;
      } else {
        // Group by country (e.g., 'US' from 'en-US')
        const parts = voice.lang.split('-');
        if (parts.length > 1) {
          groupCode = parts[1];
          try {
            groupName = new Intl.DisplayNames([navigator.language], { type: 'region' }).of(groupCode) || groupCode;
          } catch (e) {
            // Fallback if region code is invalid
            groupName = groupCode;
          }
        } else {
          // Fallback for voices without country code
          groupCode = 'other';
          groupName = 'Other';
        }
      }

      if (!groups[groupCode]) {
        groups[groupCode] = {
          lang: groupCode,
          name: groupName,
          voices: []
        };
      }

      groups[groupCode].voices.push(voice);
    });

    // Convert to array and sort by group name
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [voices, searchQuery, filterType]);

  // Get language counts for display
  const languageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    voiceGroups.forEach(group => {
      counts[group.name] = group.voices.length;
    });
    return counts;
  }, [voiceGroups]);

  // Handle voice preview
  const previewVoice = (voice: SpeechSynthesisVoice) => {
    // Use the testVoice method to properly test the voice
    speechService.testVoice(voice);
  };



  // Get filtered voices based on active tab and search query
  const getFilteredVoices = () => {
    if (activeTab === "all") {
      return voices.filter(voice => {
        const searchLower = searchQuery.toLowerCase();
        return voice.name.toLowerCase().includes(searchLower) ||
               voice.lang.toLowerCase().includes(searchLower);
      });
    } else {
      const group = voiceGroups.find(g => g.lang === activeTab);
      return group ? group.voices : [];
    }
  };

  const filteredVoices = getFilteredVoices();

  return (
    <div className="space-y-4 my-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Label htmlFor="voice-select" className="text-base font-medium">Voice</Label>
          {selectedVoiceObj && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="font-medium">
                Selected: {selectedVoiceObj.name}
              </Badge>
              <Badge variant="outline">
                {selectedVoiceObj.lang} • {selectedVoiceObj.localService ? "Local" : "Network"}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="filter-type" className="text-sm">Group by:</Label>
          <div className="flex border rounded-md overflow-hidden">
            <Button
              variant={filterType === "language" ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-8 px-3"
              onClick={() => {
                setFilterType("language");
                setActiveTab("all");
              }}
            >
              Language
            </Button>
            <Button
              variant={filterType === "country" ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-8 px-3"
              onClick={() => {
                setFilterType("country");
                setActiveTab("all");
              }}
            >
              Country
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search voices..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

      </div>

      <Card className="border">
        <CardContent className="p-0">
          {/* Language selector */}
          <div className="border-b">
            <ScrollArea className="w-full" type="always">
              <ScrollBar orientation="horizontal" />
              <div className="flex items-center p-2 gap-2 min-w-max">
                <Badge
                  key="all"
                  variant={activeTab === "all" ? "default" : "outline"}
                  className="cursor-pointer py-1 px-3 whitespace-nowrap flex-shrink-0"
                  onClick={() => setActiveTab("all")}
                >
                  All Voices ({voices.length})
                </Badge>
                {voiceGroups.map(group => (
                  <Badge
                    key={group.lang}
                    variant={activeTab === group.lang ? "default" : "outline"}
                    className="cursor-pointer py-1 px-3 whitespace-nowrap flex-shrink-0"
                    onClick={() => setActiveTab(group.lang)}
                  >
                    {group.name} ({group.voices.length})
                  </Badge>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Voice list */}
          <div className="relative h-[300px]">
            <ScrollArea className="h-full w-full absolute inset-0" type="always">
              <ScrollBar orientation="vertical" />
              <ScrollBar orientation="horizontal" />
              <div className="p-2 space-y-1">
              {filteredVoices.length > 0 ? (
                filteredVoices.map((voice) => (
                  <div
                    key={voice.name}
                    data-voice-name={voice.name}
                    className={`flex items-center justify-between p-3 rounded-md cursor-pointer hover:bg-muted transition-colors ${selectedVoice === voice.name ? 'bg-primary/10 border border-primary/20 shadow-sm' : 'border border-transparent'} ${savedVoice === voice.name ? 'ring-2 ring-primary/50 ring-offset-1 bg-primary/5' : ''}`}
                    onClick={() => onVoiceChange(voice.name)}
                    title="Click to select voice (changes apply when saved)"
                  >
                    <div className="flex-1 overflow-hidden mr-2">
                      <div className="font-medium truncate flex items-center gap-1">
                        {voice.name}
                        {savedVoice === voice.name && (
                          <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded-full font-medium">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Globe className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{voice.lang}</span>
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted">
                          {voice.localService ? "Local" : "Network"}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant={selectedVoice === voice.name ? "secondary" : "ghost"}
                      size="icon"
                      className="flex-shrink-0 h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        previewVoice(voice);
                      }}
                      title="Preview voice"
                    >
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 px-4">
                  <Search className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No voices found</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Try adjusting your search or selecting a different language filter
                  </p>
                </div>
              )}
              </div>
            </ScrollArea>
          </div>

          {/* Footer with stats and navigation */}
          <div className="border-t p-3 flex items-center justify-between bg-muted/10">
            <div className="text-sm">
              <span className="font-medium">{filteredVoices.length}</span>
              <span className="text-muted-foreground"> voices available</span>
            </div>
            {activeTab !== "all" && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 flex items-center gap-1"
                  onClick={() => {
                    const currentIndex = voiceGroups.findIndex(g => g.lang === activeTab);
                    if (currentIndex > 0) {
                      setActiveTab(voiceGroups[currentIndex - 1].lang);
                    }
                  }}
                  disabled={activeTab === voiceGroups[0]?.lang}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 flex items-center gap-1"
                  onClick={() => {
                    const currentIndex = voiceGroups.findIndex(g => g.lang === activeTab);
                    if (currentIndex < voiceGroups.length - 1) {
                      setActiveTab(voiceGroups[currentIndex + 1].lang);
                    }
                  }}
                  disabled={activeTab === voiceGroups[voiceGroups.length - 1]?.lang}
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceSelector;
