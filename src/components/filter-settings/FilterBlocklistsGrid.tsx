import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserMinus, X, Plus, Hash } from "lucide-react";
import { useFilterSettingsContext } from "@/hooks/useFilterSettingsContext";
import SettingsGrid from '@/components/settings/SettingsGrid';
import SettingsPanel from '@/components/settings/SettingsPanel';

const FilterBlocklistsGrid = () => {
  const {
    settings,
    addToListSetting,
    removeFromListSetting
  } = useFilterSettingsContext();

  // State for new items
  const [newBlockedUser, setNewBlockedUser] = useState("");
  const [newBlockedWord, setNewBlockedWord] = useState("");

  // Handle adding a blocked user
  const handleAddBlockedUser = () => {
    if (newBlockedUser.trim()) {
      addToListSetting('excludedUsernames', newBlockedUser.trim());
      setNewBlockedUser("");
    }
  };

  // Handle adding a blocked word
  const handleAddBlockedWord = () => {
    if (newBlockedWord.trim()) {
      addToListSetting('blacklistedWords', newBlockedWord.trim());
      setNewBlockedWord("");
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blocked Users Panel */}
        <div className="card p-6 border rounded-lg bg-card shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
              <UserMinus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-medium">Blocked Users</h3>
              <p className="text-sm text-muted-foreground truncate" title="Messages from these users will be ignored">Messages from these users will be ignored</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-md bg-muted/20">
              {settings.excludedUsernames?.length > 0 ? (
                settings.excludedUsernames.map((username) => (
                  <Badge
                    key={username}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {username}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removeFromListSetting('excludedUsernames', username)}
                      title="Remove user"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))
              ) : (
                <div className="text-xs text-muted-foreground w-full text-center py-2">
                  No blocked users. Add usernames below.
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Enter username to block"
                value={newBlockedUser}
                onChange={(e) => setNewBlockedUser(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddBlockedUser()}
                className="flex-1"
              />
              <Button
                onClick={handleAddBlockedUser}
                size="icon"
                disabled={!newBlockedUser.trim()}
                title="Add user to blocklist"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground truncate" title="Messages from these users will not be read aloud by the TTS system.">
              Messages from these users will not be read aloud by the TTS system.
            </p>
          </div>
        </div>

        {/* Blocked Words Panel */}
        <div className="card p-6 border rounded-lg bg-card shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
              <Hash className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-medium">Blocked Words</h3>
              <p className="text-sm text-muted-foreground truncate" title="Messages containing these words will be ignored">Messages containing these words will be ignored</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-md bg-muted/20">
              {settings.blacklistedWords?.length > 0 ? (
                settings.blacklistedWords.map((word) => (
                  <Badge
                    key={word}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {word}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removeFromListSetting('blacklistedWords', word)}
                      title="Remove word"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))
              ) : (
                <div className="text-xs text-muted-foreground w-full text-center py-2">
                  No blocked words. Add words below.
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Enter word to block"
                value={newBlockedWord}
                onChange={(e) => setNewBlockedWord(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddBlockedWord()}
                className="flex-1"
              />
              <Button
                onClick={handleAddBlockedWord}
                size="icon"
                disabled={!newBlockedWord.trim()}
                title="Add word to blocklist"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground truncate" title="Messages containing these words will not be read aloud by the TTS system.">
              Messages containing these words will not be read aloud by the TTS system.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterBlocklistsGrid;
