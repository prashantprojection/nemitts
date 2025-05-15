import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserVoiceAssignment } from "@/services/speech/types";
import { Plus, Volume2 } from "lucide-react";
import { toast } from "sonner";

interface UserVoiceFormProps {
  voices: SpeechSynthesisVoice[];
  onAddAssignment: (assignment: UserVoiceAssignment) => void;
  onUpdateAssignment: (index: number, assignment: UserVoiceAssignment) => void;
  editingAssignment: UserVoiceAssignment | null;
  editingIndex: number | null;
  onCancelEdit: () => void;
  disabled?: boolean;
}

const UserVoiceForm = ({
  voices,
  onAddAssignment,
  onUpdateAssignment,
  editingAssignment,
  editingIndex,
  onCancelEdit,
  disabled = false
}: UserVoiceFormProps) => {
  const [username, setUsername] = useState("");
  const [voiceName, setVoiceName] = useState("");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [voiceSearchQuery, setVoiceSearchQuery] = useState("");

  // Filter voices based on search query
  const filteredVoices = useMemo(() => {
    return voices.filter(voice => {
      const searchLower = voiceSearchQuery.toLowerCase();
      return (
        voice.name.toLowerCase().includes(searchLower) ||
        voice.lang.toLowerCase().includes(searchLower)
      );
    });
  }, [voices, voiceSearchQuery]);

  // Group voices by language for better organization
  const voicesByLanguage = useMemo(() => {
    const groups: Record<string, SpeechSynthesisVoice[]> = {};

    filteredVoices.forEach(voice => {
      const langCode = voice.lang.split('-')[0]; // Get the primary language code (en, fr, etc.)
      if (!groups[langCode]) {
        groups[langCode] = [];
      }
      groups[langCode].push(voice);
    });

    // Convert to array and sort by language code
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([langCode, voices]) => {
        // Get language name
        const langName = new Intl.DisplayNames([navigator.language], { type: 'language' }).of(langCode) || langCode;
        return {
          langCode,
          langName,
          voices: voices.sort((a, b) => a.name.localeCompare(b.name))
        };
      });
  }, [filteredVoices]);

  // Update form when editing an assignment
  useEffect(() => {
    if (editingAssignment) {
      setUsername(editingAssignment.username);
      setVoiceName(editingAssignment.voiceName);
      setRate(editingAssignment.rate || 1);
      setPitch(editingAssignment.pitch || 1);
      setVolume(editingAssignment.volume || 1);
    }
  }, [editingAssignment]);

  const resetForm = () => {
    setUsername("");
    setVoiceName("");
    setRate(1);
    setPitch(1);
    setVolume(1);
  };

  const handleSubmit = () => {
    if (!username.trim() || !voiceName) {
      toast.error("Username and voice are required");
      return;
    }

    const assignment: UserVoiceAssignment = {
      username: username.trim(),
      voiceName,
      rate,
      pitch,
      volume
    };

    if (editingIndex !== null) {
      onUpdateAssignment(editingIndex, assignment);
    } else {
      onAddAssignment(assignment);
    }

    resetForm();
  };

  const testVoice = () => {
    // Find the voice object by name
    const voice = voices.find(v => v.name === voiceName);

    if (voice) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Create a temporary utterance for testing
      const utterance = new SpeechSynthesisUtterance("This is a test of this user's voice");
      utterance.voice = voice;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('Testing voice with settings:', {
          voice: voice.name,
          rate,
          pitch,
          volume
        });
      }

      // Speak the test message
      window.speechSynthesis.speak(utterance);
    } else {
      console.error('Voice not found for testing:', voiceName);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-base">
          {editingIndex !== null ? "Edit Voice Assignment" : "Add New Voice Assignment"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="username" className="text-sm font-medium mb-1.5 block">Username</Label>
            <Input
              id="username"
              placeholder="Enter Twitch username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={disabled}
              className="h-10"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <Label htmlFor="voice" className="text-sm font-medium">Voice</Label>
              {voiceName && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => testVoice()}
                >
                  <Volume2 className="h-3 w-3 mr-1" />
                  Test
                </Button>
              )}
            </div>
            <Select value={voiceName} onValueChange={setVoiceName} disabled={disabled}>
              <SelectTrigger id="voice" className="h-10">
                <SelectValue placeholder="Select a voice" className="truncate max-w-[90%]" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]">
                <div className="px-3 py-2 sticky top-0 bg-background border-b z-10 shadow-sm">
                  <Input
                    type="text"
                    placeholder="Search voices..."
                    value={voiceSearchQuery}
                    onChange={(e) => setVoiceSearchQuery(e.target.value)}
                    className="h-8"
                  />
                </div>
                {filteredVoices.length === 0 ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    No voices found
                  </div>
                ) : (
                  voicesByLanguage.map(group => (
                    <div key={group.langCode}>
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50">
                        {group.langName}
                      </div>
                      {group.voices.map(voice => (
                        <SelectItem
                          key={voice.name}
                          value={voice.name}
                          className="flex justify-between items-center py-2"
                        >
                          <div className="flex flex-col max-w-[90%] overflow-hidden">
                            <span className="truncate">{voice.name}</span>
                            <span className="text-xs text-muted-foreground truncate">
                              {voice.localService ? "Local" : "Network"}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <Label htmlFor="rate" className="text-sm font-medium">Rate</Label>
              <span className="text-sm text-muted-foreground">{rate.toFixed(1)}x</span>
            </div>
            <Slider
              id="rate"
              min={0.1}
              max={2}
              step={0.1}
              value={[rate]}
              onValueChange={(value) => setRate(value[0])}
              disabled={disabled}
              className="mt-1.5"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <Label htmlFor="pitch" className="text-sm font-medium">Pitch</Label>
              <span className="text-sm text-muted-foreground">{pitch.toFixed(1)}</span>
            </div>
            <Slider
              id="pitch"
              min={0.1}
              max={2}
              step={0.1}
              value={[pitch]}
              onValueChange={(value) => setPitch(value[0])}
              disabled={disabled}
              className="mt-1.5"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <Label htmlFor="volume" className="text-sm font-medium">Volume</Label>
              <span className="text-sm text-muted-foreground">{(volume * 100).toFixed(0)}%</span>
            </div>
            <Slider
              id="volume"
              min={0}
              max={1}
              step={0.01}
              value={[volume]}
              onValueChange={(value) => setVolume(value[0])}
              disabled={disabled}
              className="mt-1.5"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={testVoice}
            disabled={!voiceName || disabled}
            className="flex-1 h-10"
          >
            Test Voice
          </Button>

          {editingIndex !== null ? (
            <>
              <Button
                variant="outline"
                onClick={onCancelEdit}
                className="flex-1 h-10"
                disabled={disabled}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 h-10"
                disabled={disabled}
              >
                Update
              </Button>
            </>
          ) : (
            <Button
              onClick={handleSubmit}
              className="flex-1 h-10"
              disabled={disabled}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserVoiceForm;
