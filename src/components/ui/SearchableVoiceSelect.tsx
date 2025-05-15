import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SearchableVoiceSelectProps {
  voices: SpeechSynthesisVoice[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  id: string;
  className?: string;
  showSavedStatus?: boolean;
}

const SearchableVoiceSelect = ({
  voices,
  value,
  onValueChange,
  placeholder,
  id,
  className = "",
  showSavedStatus = false,
}: SearchableVoiceSelectProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredVoices, setFilteredVoices] = useState<SpeechSynthesisVoice[]>(voices);

  // Filter voices when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredVoices(voices);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = voices.filter((voice) =>
      voice.name.toLowerCase().includes(query)
    );
    setFilteredVoices(filtered);
  }, [searchQuery, voices]);

  // Reset search when select is closed
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSearchQuery("");
    }
  };

  // Set to default voice
  const handleSetDefault = () => {
    onValueChange("default");
  };

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      onOpenChange={handleOpenChange}
    >
      <SelectTrigger
        id={id}
        className={`w-full ${
          showSavedStatus && value
            ? "border-green-500 ring-1 ring-green-500/20"
            : ""
        } ${className}`}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <div className="flex items-center gap-2 p-2 sticky top-0 bg-background z-10 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search voices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1.5 h-6 w-6"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSetDefault}
            className="whitespace-nowrap"
          >
            Use Default
          </Button>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          <SelectItem value="default">Default Voice (None)</SelectItem>
          {filteredVoices.map((voice) => (
            <SelectItem key={voice.name} value={voice.name}>
              {voice.name}
            </SelectItem>
          ))}
          {filteredVoices.length === 0 && (
            <div className="p-2 text-center text-sm text-muted-foreground">
              No voices found
            </div>
          )}
        </div>
      </SelectContent>
    </Select>
  );
};

export default SearchableVoiceSelect;
