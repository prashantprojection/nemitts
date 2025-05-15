import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Volume2, Play, Wand2 } from "lucide-react";
import speechService from "@/services/SpeechService";

interface VoiceComparisonProps {
  voices: SpeechSynthesisVoice[];
  selectedVoice: string;
  onVoiceSelect: (voice: string) => void;
}

const VoiceComparison = ({ voices, selectedVoice, onVoiceSelect }: VoiceComparisonProps) => {
  const [compareVoices, setCompareVoices] = useState<string[]>([]);
  const [testText, setTestText] = useState("This is a test of the selected voice.");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  
  // Add a voice to comparison
  const addToComparison = (voiceName: string) => {
    if (compareVoices.length < 3 && !compareVoices.includes(voiceName)) {
      setCompareVoices([...compareVoices, voiceName]);
    }
  };
  
  // Remove a voice from comparison
  const removeFromComparison = (voiceName: string) => {
    setCompareVoices(compareVoices.filter(v => v !== voiceName));
  };
  
  // Test a specific voice
  const testVoice = (voiceName: string) => {
    const voice = voices.find(v => v.name === voiceName);
    if (voice) {
      const utterance = new SpeechSynthesisUtterance(testText);
      utterance.voice = voice;
      utterance.rate = rate;
      utterance.pitch = pitch;
      window.speechSynthesis.speak(utterance);
    }
  };
  
  // Test all voices in comparison
  const testAllVoices = () => {
    compareVoices.forEach((voiceName, index) => {
      const voice = voices.find(v => v.name === voiceName);
      if (voice) {
        const utterance = new SpeechSynthesisUtterance(testText);
        utterance.voice = voice;
        utterance.rate = rate;
        utterance.pitch = pitch;
        
        // Add a delay between each voice
        setTimeout(() => {
          window.speechSynthesis.speak(utterance);
        }, index * 3000); // 3 second delay between voices
      }
    });
  };
  
  // Select a voice from comparison
  const selectVoice = (voiceName: string) => {
    onVoiceSelect(voiceName);
  };
  
  // Get voice details
  const getVoiceDetails = (voiceName: string) => {
    const voice = voices.find(v => v.name === voiceName);
    if (!voice) return null;
    
    return {
      name: voice.name,
      lang: voice.lang,
      isLocal: voice.localService,
      isDefault: voice.default
    };
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Wand2 className="h-4 w-4" />
          Voice Comparison
        </CardTitle>
        <CardDescription>
          Compare different voices side by side
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Voice comparison controls */}
        <div className="flex items-center justify-between">
          <div className="text-sm">
            {compareVoices.length === 0 ? (
              <span className="text-muted-foreground">Add voices to compare</span>
            ) : (
              <span>{compareVoices.length} voice{compareVoices.length !== 1 ? 's' : ''} selected</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => addToComparison(selectedVoice)}
              disabled={compareVoices.includes(selectedVoice) || compareVoices.length >= 3}
            >
              Add Current Voice
            </Button>
            {compareVoices.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={testAllVoices}
              >
                <Volume2 className="h-4 w-4 mr-1" />
                Test All
              </Button>
            )}
          </div>
        </div>
        
        {/* Voice comparison cards */}
        {compareVoices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {compareVoices.map(voiceName => {
              const voiceDetails = getVoiceDetails(voiceName);
              if (!voiceDetails) return null;
              
              return (
                <Card key={voiceName} className={`border ${selectedVoice === voiceName ? 'border-primary' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col h-full">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-sm truncate" title={voiceDetails.name}>
                            {voiceDetails.name}
                          </h3>
                          <p className="text-xs text-muted-foreground">{voiceDetails.lang}</p>
                        </div>
                        <Badge variant={voiceDetails.isLocal ? "outline" : "secondary"} className="text-xs">
                          {voiceDetails.isLocal ? "Local" : "Network"}
                        </Badge>
                      </div>
                      
                      <div className="flex gap-2 mt-auto pt-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => testVoice(voiceName)}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Test
                        </Button>
                        <Button 
                          variant={selectedVoice === voiceName ? "default" : "outline"} 
                          size="sm" 
                          className="flex-1"
                          onClick={() => selectVoice(voiceName)}
                        >
                          {selectedVoice === voiceName ? "Selected" : "Select"}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="px-2"
                          onClick={() => removeFromComparison(voiceName)}
                        >
                          &times;
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 border rounded-md bg-muted/10">
            <Volume2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-1">No voices to compare</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add voices to compare them side by side
            </p>
          </div>
        )}
        
        {/* Voice test settings */}
        {compareVoices.length > 0 && (
          <Card className="border-dashed">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Test Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="test-rate">Rate</Label>
                  <span className="text-sm">{rate.toFixed(1)}x</span>
                </div>
                <Slider
                  id="test-rate"
                  min={0.1}
                  max={2}
                  step={0.1}
                  value={[rate]}
                  onValueChange={([value]) => setRate(value)}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="test-pitch">Pitch</Label>
                  <span className="text-sm">{pitch.toFixed(1)}</span>
                </div>
                <Slider
                  id="test-pitch"
                  min={0.1}
                  max={2}
                  step={0.1}
                  value={[pitch]}
                  onValueChange={([value]) => setPitch(value)}
                />
              </div>
              
              <div className="pt-2">
                <textarea
                  className="w-full p-2 border rounded-md text-sm"
                  rows={2}
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  placeholder="Enter text to test voices with..."
                />
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceComparison;
