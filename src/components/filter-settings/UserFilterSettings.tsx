import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFilterSettingsContext } from "@/hooks/useFilterSettingsContext";
import { X, Plus } from "lucide-react";

const UserFilterSettings = () => {
  const {
    settings,
    addToListSetting,
    removeFromListSetting
  } = useFilterSettingsContext();

  const [newBlockedUser, setNewBlockedUser] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">User Filtering</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Messages from these users will never be read.
            </p>

            <div className="flex gap-2">
              <Input
                placeholder="Enter username to block"
                value={newBlockedUser}
                onChange={(e) => setNewBlockedUser(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newBlockedUser.trim()) {
                    const username = newBlockedUser.trim().toLowerCase();
                    addToListSetting('excludedUsernames', username);
                    setNewBlockedUser("");
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={() => {
                  if (newBlockedUser.trim()) {
                    const username = newBlockedUser.trim().toLowerCase();
                    addToListSetting('excludedUsernames', username);
                    setNewBlockedUser("");
                  }
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {settings.excludedUsernames?.length > 0 ? (
                settings.excludedUsernames.map((username) => (
                  <Badge key={username} variant="secondary" className="flex items-center gap-1">
                    {username}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removeFromListSetting('excludedUsernames', username)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))
              ) : (
                <div className="text-xs text-muted-foreground">
                  No blocked users. Add usernames above to never read their messages.
                </div>
              )}
            </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserFilterSettings;
