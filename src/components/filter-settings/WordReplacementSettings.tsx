import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Pencil, Trash2, Plus, Save, Check, AlertCircle } from "lucide-react";
import { useFilterSettingsContext } from "@/hooks/useFilterSettingsContext";
import { WordReplacement } from "@/services/speech/types";

const WordReplacementSettings = () => {
  const { settings, updateSetting } = useFilterSettingsContext();

  // Local state for the word replacement being added/edited
  const [pattern, setPattern] = useState("");
  const [replacement, setReplacement] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  // Always use whole word matching for simplicity
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Get the wordReplacements from settings or default to empty array
  const wordReplacements = settings.wordReplacements || [];

  // No need for a separate validation function - we'll check directly in handleAddReplacement

  // Handle adding a new word replacement
  const handleAddReplacement = () => {
    if (!pattern.trim() || !replacement.trim()) return;

    const newReplacements = [...wordReplacements];

    if (editingIndex !== null) {
      // Update existing replacement
      newReplacements[editingIndex] = {
        pattern: pattern.trim(),
        replacement: replacement.trim(),
        caseSensitive,
        wholeWord: true // Always use whole word matching for simplicity
      };
    } else {
      // Add new replacement
      newReplacements.push({
        pattern: pattern.trim(),
        replacement: replacement.trim(),
        caseSensitive,
        wholeWord: true // Always use whole word matching for simplicity
      });
    }

    updateSetting('wordReplacements', newReplacements);

    // Reset form
    setPattern("");
    setReplacement("");
    setCaseSensitive(false);
    setEditingIndex(null);
  };

  // Handle editing a word replacement
  const handleEditReplacement = (index: number) => {
    const replacementToEdit = wordReplacements[index];
    setPattern(replacementToEdit.pattern);
    setReplacement(replacementToEdit.replacement);
    setCaseSensitive(replacementToEdit.caseSensitive);
    setEditingIndex(index);
  };

  // Handle deleting a word replacement
  const handleDeleteReplacement = (index: number) => {
    const newReplacements = [...wordReplacements];
    newReplacements.splice(index, 1);
    updateSetting('wordReplacements', newReplacements);
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">Word Replacements</CardTitle>
          <CardDescription>
            Replace chat abbreviations with full words for clearer TTS
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {wordReplacements.length} {wordReplacements.length === 1 ? 'replacement' : 'replacements'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pattern">Find this word</Label>
              <Input
                id="pattern"
                placeholder="Enter word to replace"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Words will only match when they appear as complete words</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="replacement">Replace with</Label>
              <Input
                id="replacement"
                placeholder="Enter replacement text"
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">This text will be spoken instead</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="case-sensitive"
              checked={caseSensitive}
              onCheckedChange={setCaseSensitive}
            />
            <div>
              <Label htmlFor="case-sensitive">Match exact capitalization</Label>
              <p className="text-xs text-muted-foreground">When on, "Hello" and "hello" are treated as different words</p>
            </div>
          </div>

          {editingIndex !== null ? (
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => {
                  // Reset form without saving
                  setPattern("");
                  setReplacement("");
                  setCaseSensitive(false);
                  setEditingIndex(null);
                }}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddReplacement}
                disabled={!pattern.trim() || !replacement.trim()}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleAddReplacement}
              className="w-full"
              disabled={!pattern.trim() || !replacement.trim()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Word Replacement
            </Button>
          )}
        </div>

        {wordReplacements.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Find this word</TableHead>
                <TableHead>Replace with</TableHead>
                <TableHead className="w-[120px]">Case sensitive</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wordReplacements.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.pattern}</TableCell>
                  <TableCell>{item.replacement}</TableCell>
                  <TableCell>
                    {item.caseSensitive ? (
                      <Badge variant="default" className="w-fit">
                        <Check className="h-3 w-3 mr-1" />
                        Yes
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="w-fit">
                        No
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditReplacement(index)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteReplacement(index)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <p>No word replacements added yet.</p>
            <p className="text-sm mt-1">Examples:</p>
            <ul className="text-sm mt-2 list-disc list-inside">
              <li>Replace "lol" with "laughing out loud"</li>
              <li>Replace "brb" with "be right back"</li>
              <li>Replace "ty" with "thank you"</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WordReplacementSettings;
