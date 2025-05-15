import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useFilterSettingsContext } from "@/hooks/useFilterSettingsContext";
import BlocklistTable from "./BlocklistTable";
import { UserMinus, Hash, Download, Loader2 } from "lucide-react";
import twitchUserListService from "@/services/twitch/TwitchUserListService";
import twitchAuthService from "@/services/twitch/TwitchAuthService";

const BlocklistSettings = () => {
  const {
    settings,
    updateSetting,
    addToListSetting,
    removeFromListSetting
  } = useFilterSettingsContext();

  const [isImporting, setIsImporting] = useState(false);

  // Get blocked users from blacklistedUsers
  const blockedUsers = Array.isArray(settings.blacklistedUsers)
    ? settings.blacklistedUsers
    : [];

  // Handle adding a blocked user
  const handleAddBlockedUser = (username: string) => {
    // Add to blacklistedUsers
    addToListSetting('blacklistedUsers', username.toLowerCase().replace(/^@/, ''));
  };

  // Handle removing a blocked user
  const handleRemoveBlockedUser = (username: string) => {
    console.log('Removing blocked user:', username);

    // Create a promise to ensure the operation completes before moving on
    return new Promise<void>((resolve) => {
      try {
        if (Array.isArray(settings.blacklistedUsers)) {
          // Find the exact username with the same case
          const exactUser = settings.blacklistedUsers.find(
            u => u.toLowerCase() === username.toLowerCase().replace(/^@/, '')
          );

          if (exactUser) {
            // Use a direct update to ensure the state is updated properly
            const newList = settings.blacklistedUsers.filter(u => u !== exactUser);
            updateSetting('blacklistedUsers', newList);
          }
        }

        // Longer delay to ensure state updates properly
        setTimeout(() => {
          console.log(`Finished removing user: ${username}`);
          resolve();
        }, 500);
      } catch (error) {
        console.error(`Error removing user ${username}:`, error);
        resolve(); // Resolve anyway to continue with other deletions
      }
    });
  };

  // Import blocked terms from Twitch
  const importBlockedTermsFromTwitch = async () => {
    // Check if user is logged in to Twitch
    const authState = twitchAuthService.getAuthState();
    if (!authState.isLoggedIn || !authState.accessToken) {
      toast.error("You need to be logged in to Twitch to import blocked terms");
      return;
    }

    // Check if the required scope is available
    if (!authState.scopes?.includes('moderator:read:blocked_terms')) {
      toast.error("Missing required Twitch permission: moderator:read:blocked_terms. Please log out and log in again.");
      return;
    }

    setIsImporting(true);
    try {
      // Function to add a term to the blocklist
      const addToBlocklist = (term: string) => {
        addToListSetting('blacklistedWords', term.toLowerCase());
      };

      // Import the blocked terms
      const importCount = await twitchUserListService.importBlockedTermsToBlocklist(addToBlocklist);

      if (importCount > 0) {
        toast.success(`Successfully imported ${importCount} blocked terms from Twitch`);
      } else {
        toast.info("No blocked terms found to import from Twitch");
      }
    } catch (error) {
      console.error('Error importing blocked terms:', error);
      toast.error("Failed to import blocked terms from Twitch");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">Blocklists</CardTitle>
          <CardDescription>
            Configure words and users to block from TTS
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <UserMinus className="h-3 w-3" />
            {blockedUsers.length} {blockedUsers.length === 1 ? 'user' : 'users'}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Hash className="h-3 w-3" />
            {(settings.blacklistedWords || []).length} {(settings.blacklistedWords || []).length === 1 ? 'word' : 'words'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="users">
          <TabsList className="flex w-full bg-muted/30 p-2 gap-2 rounded-lg h-auto mb-4">
            <TabsTrigger
              value="users"
              className="flex-1 px-4 py-2 rounded-md border border-transparent hover:bg-muted/50 data-[state=active]:bg-background data-[state=active]:border-primary data-[state=active]:shadow-sm flex items-center justify-center"
            >
              <UserMinus className="h-4 w-4 mr-2" />
              Blocked Users
            </TabsTrigger>
            <TabsTrigger
              value="words"
              className="flex-1 px-4 py-2 rounded-md border border-transparent hover:bg-muted/50 data-[state=active]:bg-background data-[state=active]:border-primary data-[state=active]:shadow-sm flex items-center justify-center"
            >
              <Hash className="h-4 w-4 mr-2" />
              Blocked Words
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="pt-4">
            <BlocklistTable
              items={blockedUsers}
              onAdd={handleAddBlockedUser}
              onRemove={handleRemoveBlockedUser}
              type="users"
              placeholder="Enter username to block"
            />
          </TabsContent>

          <TabsContent value="words" className="pt-4">
            <div className="mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={importBlockedTermsFromTwitch}
                disabled={isImporting}
                className="flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Import Blocked Terms from Twitch
                  </>
                )}
              </Button>
            </div>
            <BlocklistTable
              items={settings.blacklistedWords || []}
              onAdd={(word) => {
                console.log('Adding blocked word:', word);
                addToListSetting('blacklistedWords', word.toLowerCase());
              }}
              onRemove={async (word) => {
                console.log('Removing blocked word:', word);
                return new Promise<void>((resolve) => {
                  try {
                    if (Array.isArray(settings.blacklistedWords)) {
                      // Find the exact word with the same case
                      const exactWord = settings.blacklistedWords.find(
                        w => w.toLowerCase() === word.toLowerCase()
                      );

                      if (exactWord) {
                        // Use a direct update to ensure the state is updated properly
                        const newList = settings.blacklistedWords.filter(w => w !== exactWord);
                        updateSetting('blacklistedWords', newList);
                      } else {
                        // Fallback to removing by lowercase comparison
                        const newList = settings.blacklistedWords.filter(
                          w => w.toLowerCase() !== word.toLowerCase()
                        );
                        updateSetting('blacklistedWords', newList);
                      }
                    }

                    // Longer delay to ensure state updates properly
                    setTimeout(() => {
                      console.log(`Finished removing word: ${word}`);
                      resolve();
                    }, 500);
                  } catch (error) {
                    console.error(`Error removing word ${word}:`, error);
                    resolve(); // Resolve anyway to continue with other deletions
                  }
                });
              }}
              type="words"
              placeholder="Enter word to block"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default BlocklistSettings;
