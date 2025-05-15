import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFilterSettingsContext } from "@/hooks/useFilterSettingsContext";
import { X, Plus } from "lucide-react";

const WordFilterSettings = () => {
  const {
    settings,
    addToListSetting,
    removeFromListSetting
  } = useFilterSettingsContext();

  const [newBlacklistedWord, setNewBlacklistedWord] = useState("");
  const [newWhitelistedWord, setNewWhitelistedWord] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Word Filtering</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="blacklist">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="blacklist">Blacklisted Words</TabsTrigger>
            <TabsTrigger value="whitelist">Whitelisted Words</TabsTrigger>
          </TabsList>

          <TabsContent value="blacklist" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Messages containing these words will be skipped.
            </p>

            <div className="flex gap-2">
              <Input
                placeholder="Enter word to blacklist"
                value={newBlacklistedWord}
                onChange={(e) => setNewBlacklistedWord(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newBlacklistedWord.trim()) {
                    addToListSetting('blacklistedWords', newBlacklistedWord.trim().toLowerCase());
                    setNewBlacklistedWord("");
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={() => {
                  if (newBlacklistedWord.trim()) {
                    addToListSetting('blacklistedWords', newBlacklistedWord.trim().toLowerCase());
                    setNewBlacklistedWord("");
                  }
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {settings.blacklistedWords?.length > 0 ? (
                settings.blacklistedWords.map((word) => (
                  <Badge key={word} variant="secondary" className="flex items-center gap-1">
                    {word}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removeFromListSetting('blacklistedWords', word)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))
              ) : (
                <div className="text-xs text-muted-foreground">
                  No blacklisted words. Add words above to skip messages containing them.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="whitelist" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Messages containing these words will be prioritized.
            </p>

            <div className="flex gap-2">
              <Input
                placeholder="Enter word to whitelist"
                value={newWhitelistedWord}
                onChange={(e) => setNewWhitelistedWord(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newWhitelistedWord.trim()) {
                    addToListSetting('whitelistedWords', newWhitelistedWord.trim().toLowerCase());
                    setNewWhitelistedWord("");
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={() => {
                  if (newWhitelistedWord.trim()) {
                    addToListSetting('whitelistedWords', newWhitelistedWord.trim().toLowerCase());
                    setNewWhitelistedWord("");
                  }
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {settings.whitelistedWords?.length > 0 ? (
                settings.whitelistedWords.map((word) => (
                  <Badge key={word} variant="secondary" className="flex items-center gap-1">
                    {word}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removeFromListSetting('whitelistedWords', word)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))
              ) : (
                <div className="text-xs text-muted-foreground">
                  No whitelisted words. Add words above to prioritize messages containing them.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default WordFilterSettings;
