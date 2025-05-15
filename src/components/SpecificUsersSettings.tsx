import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Info } from "lucide-react";
// Toast functionality removed
// Tooltip components removed
import { useFilterSettingsContext } from "@/hooks/useFilterSettingsContext";
import twitchAuthService from "@/services/twitch/TwitchAuthService";
import twitchUserListService from "@/services/twitch/TwitchUserListService";

const SpecificUsersSettings = () => {
  const {
    settings,
    updateSetting,
    // updateListSetting removed (unused)
    addToListSetting,
    removeFromListSetting
  } = useFilterSettingsContext();

  const [newSpecificUser, setNewSpecificUser] = useState("");
  const [isLoggedInToTwitch, setIsLoggedInToTwitch] = useState(false);
  const [isBroadcaster, setIsBroadcaster] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [hasRequiredPermissions, setHasRequiredPermissions] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<{
    subscribers: boolean;
    vips: boolean;
    moderators: boolean;
  }>({ subscribers: false, vips: false, moderators: false });
  const [enableSubscribers, setEnableSubscribers] = useState(false);
  const [enableVips, setEnableVips] = useState(false);
  const [enableModerators, setEnableModerators] = useState(false);
  // Loading state removed (unused)

  // Check if user is logged in to Twitch
  useEffect(() => {
    const authState = twitchAuthService.getAuthState();
    const isLoggedIn = !!authState.accessToken;
    setIsLoggedInToTwitch(isLoggedIn);

    // Check if user has all required permissions
    if (isLoggedIn) {
      const hasPermissions = twitchUserListService.checkRequiredPermissions();
      setHasRequiredPermissions(hasPermissions);

      // Check for missing scopes
      const missingScopes = twitchUserListService.getMissingScopes();
      if (missingScopes.length > 0) {
        console.log('Missing Twitch scopes:', missingScopes);

        // Check for critical scopes
        const criticalScopes = [
          'moderation:read',
          'channel:read:vips',
          'channel:read:subscriptions'
        ];

        const missingCriticalScopes = criticalScopes.filter(scope => missingScopes.includes(scope));
        if (missingCriticalScopes.length > 0) {
          // Show notification in status bar instead of toast
          window.dispatchEvent(new CustomEvent('status-notification', {
            detail: {
              type: 'error',
              message: 'Missing Twitch permissions. Some features may not work correctly. Please log out and log in again.'
            }
          }));
        }
      }
    }

    // Check if subscribers, VIPs, or moderators are already in the specific users list
    const hasSubscribers = settings.specificUsersList.includes('@subscribers');
    const hasVips = settings.specificUsersList.includes('@vips');
    const hasModerators = settings.specificUsersList.includes('@moderators');

    setEnableSubscribers(hasSubscribers);
    setEnableVips(hasVips);
    setEnableModerators(hasModerators);

    // Check if user is broadcaster or moderator and check permissions for each feature
    const checkUserStatus = async () => {
      if (isLoggedIn) {
        try {
          // Check if the user is the broadcaster by comparing username with channel name
          const isBroadcaster = authState.username && authState.channelName &&
                               authState.username.toLowerCase() === authState.channelName.toLowerCase();
          setIsBroadcaster(isBroadcaster);

          // Check if the user is a moderator using the new helper method
          const isMod = await twitchUserListService.isCurrentUserModerator();
          setIsModerator(isMod);

          // If user is broadcaster or moderator, they have required permissions
          if (isBroadcaster || isMod) {
            setHasRequiredPermissions(true);
          }

          // Check permissions for each feature
          const subscribersPermission = await twitchUserListService.hasPermissionFor('subscribers');
          const vipsPermission = await twitchUserListService.hasPermissionFor('vips');
          const moderatorsPermission = await twitchUserListService.hasPermissionFor('moderators');

          setPermissionStatus({
            subscribers: subscribersPermission,
            vips: vipsPermission,
            moderators: moderatorsPermission
          });

        } catch (error) {
          console.error('Error checking user status:', error);
          setIsBroadcaster(false);
          setIsModerator(false);
          setPermissionStatus({ subscribers: false, vips: false, moderators: false });
        }
      } else {
        setIsBroadcaster(false);
        setIsModerator(false);
        setPermissionStatus({ subscribers: false, vips: false, moderators: false });
      }
    };

    checkUserStatus();
  }, [settings.specificUsersList]);

  // Handle toggling subscribers
  const handleToggleSubscribers = (checked: boolean) => {
    setEnableSubscribers(checked);

    if (checked && !settings.specificUsersList.includes('@subscribers')) {
      addToListSetting('specificUsersList', '@subscribers');
    } else if (!checked) {
      removeFromListSetting('specificUsersList', '@subscribers');
    }
  };

  // Handle toggling VIPs
  const handleToggleVips = (checked: boolean) => {
    setEnableVips(checked);

    if (checked && !settings.specificUsersList.includes('@vips')) {
      addToListSetting('specificUsersList', '@vips');
    } else if (!checked) {
      removeFromListSetting('specificUsersList', '@vips');
    }
  };

  // Handle toggling moderators
  const handleToggleModerators = (checked: boolean) => {
    setEnableModerators(checked);

    if (checked && !settings.specificUsersList.includes('@moderators')) {
      addToListSetting('specificUsersList', '@moderators');
    } else if (!checked) {
      removeFromListSetting('specificUsersList', '@moderators');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Allowed Users</CardTitle>
        <CardDescription>
          Choose which users can trigger TTS messages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between bg-muted/30 p-3 rounded-md border">
          <div className="flex items-center gap-2">
            <Label htmlFor="specific-users-only" className="font-medium">
              Enable Allowed Users Mode
            </Label>
            <p className="text-xs text-muted-foreground">
              When enabled, TTS will only read messages from users you select
            </p>
          </div>
          <Switch
            id="specific-users-only"
            checked={settings.specificUsersOnly}
            onCheckedChange={(checked) => updateSetting('specificUsersOnly', checked)}
          />
        </div>

        {/* Twitch User Groups */}
        {isLoggedInToTwitch && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Include Twitch User Groups</Label>
                {isLoggedInToTwitch && (
                  <Badge
                    variant={isBroadcaster || isModerator ? "default" : "outline"}
                    className={isBroadcaster
                      ? "bg-green-600"
                      : isModerator
                        ? "bg-purple-600"
                        : "text-amber-600 border-amber-300 dark:border-amber-700"}
                  >
                    {isBroadcaster ? "Channel Owner" : isModerator ? "Moderator" : "Viewer"}
                  </Badge>
                )}
              </div>

              {isLoggedInToTwitch && (
                <div className="text-xs bg-muted/50 p-2 rounded-md border">
                  <div className="flex justify-between items-center mb-1">
                    <div className="font-medium">Monitoring Channel: <span className="text-primary">{twitchAuthService.getAuthState().channelName || "Not set"}</span>
                    {isLoggedInToTwitch && twitchAuthService.getAuthState().channelName && (
                      <Badge className="ml-2" variant={isBroadcaster ? "default" : isModerator ? "secondary" : "outline"}>
                        {isBroadcaster ? "Owner" : isModerator ? "Moderator" : "Viewer"}
                      </Badge>
                    )}
                  </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => {
                        const newChannel = prompt("Which Twitch channel do you want to monitor?", twitchAuthService.getAuthState().channelName);
                        if (newChannel && newChannel.trim() !== "") {
                          twitchAuthService.setChannelName(newChannel.trim());
                          // Force a re-check of user status
                          setTimeout(async () => {
                            const authState = twitchAuthService.getAuthState();
                            // Check broadcaster status
                            const isBroadcaster = authState.username?.toLowerCase() === authState.channelName?.toLowerCase();
                            setIsBroadcaster(isBroadcaster);

                            // Check moderator status using the helper method
                            const isMod = await twitchUserListService.isCurrentUserModerator();
                            setIsModerator(isMod);

                            // Update permissions status
                            setHasRequiredPermissions(isBroadcaster || isMod);

                            // Check permissions for each feature
                            const subscribersPermission = await twitchUserListService.hasPermissionFor('subscribers');
                            const vipsPermission = await twitchUserListService.hasPermissionFor('vips');
                            const moderatorsPermission = await twitchUserListService.hasPermissionFor('moderators');

                            setPermissionStatus({
                              subscribers: subscribersPermission,
                              vips: vipsPermission,
                              moderators: moderatorsPermission
                            });
                          }, 100);
                        }
                      }}
                    >
                      Change Channel
                    </Button>
                  </div>
                  <div className="font-medium">Your Twitch Account: <span className="text-primary">{twitchAuthService.getAuthState().username || "Unknown"}</span></div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                These options allow you to include all users of a specific type in your TTS.
                {!isBroadcaster && !isModerator && (
                  <div className="block mt-1 px-2 py-1 bg-amber-100 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md text-amber-700 dark:text-amber-400">
                    <div className="flex justify-between items-start">
                      <div>
                        <strong>Note:</strong> For best results, connect to your own Twitch channel.
                        {!hasRequiredPermissions && " You need to log in with proper permissions."}
                      </div>
                      {!hasRequiredPermissions && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-6 text-xs ml-2 bg-amber-200 hover:bg-amber-300 text-amber-900 dark:bg-amber-900 dark:hover:bg-amber-800 dark:text-amber-100"
                          onClick={() => twitchAuthService.login()}
                        >
                          Log in
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                {isModerator && !isBroadcaster && (
                  <div className="block mt-1 px-2 py-1 bg-purple-100 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-md text-purple-700 dark:text-purple-400">
                    <div className="flex justify-between items-start">
                      <div>
                        <strong>Note:</strong> As a moderator, you can use most features in this channel.
                      </div>
                    </div>
                  </div>
                )}
              </p>
            </div>

            {/* Subscribers Toggle */}
            <div className="flex items-center justify-between relative">
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <Label htmlFor="enable-subscribers" className="text-sm font-medium">
                    Include Subscribers
                  </Label>
                  {!permissionStatus.subscribers && (
                    <Badge variant="outline" className="text-[10px] font-normal text-amber-600 border-amber-300 dark:border-amber-700">
                      Owner Only
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Read messages from all subscribers in your channel
                  {enableSubscribers && !permissionStatus.subscribers && (
                    <span className="block mt-1 text-amber-600 dark:text-amber-400">
                      Note: Only channel owners can access the subscriber list
                    </span>
                  )}
                </p>
              </div>
              <Switch
                id="enable-subscribers"
                checked={enableSubscribers}
                onCheckedChange={handleToggleSubscribers}
                disabled={!settings.specificUsersOnly}
              />
            </div>

            {/* VIPs Toggle */}
            <div className="flex items-center justify-between relative">
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <Label htmlFor="enable-vips" className="text-sm font-medium">
                    Include VIPs
                  </Label>
                  {!permissionStatus.vips && (
                    <Badge variant="outline" className="text-[10px] font-normal text-amber-600 border-amber-300 dark:border-amber-700">
                      Mod/Owner
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Read messages from all VIPs in your channel
                  {enableVips && !permissionStatus.vips && (
                    <span className="block mt-1 text-amber-600 dark:text-amber-400">
                      Note: {!hasRequiredPermissions
                        ? "Login required to access VIP list"
                        : "You need channel owner or moderator permissions"}
                    </span>
                  )}
                </p>
              </div>
              <Switch
                id="enable-vips"
                checked={enableVips}
                onCheckedChange={handleToggleVips}
                disabled={!settings.specificUsersOnly}
              />
            </div>

            {/* Moderators Toggle */}
            <div className="flex items-center justify-between relative">
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <Label htmlFor="enable-moderators" className="text-sm font-medium">
                    Include Moderators
                  </Label>
                  {!permissionStatus.moderators && (
                    <Badge variant="outline" className="text-[10px] font-normal text-amber-600 border-amber-300 dark:border-amber-700">
                      Mod/Owner
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Read messages from all moderators in your channel
                  {enableModerators && !permissionStatus.moderators && (
                    <span className="block mt-1 text-amber-600 dark:text-amber-400">
                      Note: {!hasRequiredPermissions
                        ? "Login required to access moderator list"
                        : "You need channel owner or moderator permissions"}
                    </span>
                  )}
                </p>
              </div>
              <Switch
                id="enable-moderators"
                checked={enableModerators}
                onCheckedChange={handleToggleModerators}
                disabled={!settings.specificUsersOnly}
              />
            </div>
          </div>
        )}

        {!isLoggedInToTwitch && settings.specificUsersOnly && (
          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
            <p className="text-sm mb-2 text-blue-800 dark:text-blue-300">Connect your Twitch account to use subscriber, VIP, and moderator filters</p>
            <Button
              variant="outline"
              size="sm"
              className="bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:hover:bg-blue-800/70 dark:text-blue-300 dark:border-blue-700"
              onClick={() => twitchAuthService.login()}
            >
              Connect Twitch Account
            </Button>
          </div>
        )}

        {isLoggedInToTwitch && settings.specificUsersOnly && (!permissionStatus.subscribers || !permissionStatus.vips || !permissionStatus.moderators) && (
          <div className="mt-4 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-medium text-amber-800 dark:text-amber-400">Permission Information</p>
            </div>

            <p className="text-xs text-amber-700 dark:text-amber-400">
              {!isBroadcaster && !isModerator
                ? "Some features are only available to channel owners and moderators. You're currently connected as a viewer."
                : "Some features require specific permissions based on your role in the channel."}
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>Allowed Users</Label>
            {settings.specificUsersList?.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {settings.specificUsersList.length} user{settings.specificUsersList.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-2 min-h-[40px] p-2 border rounded-md bg-muted/20">
            {settings.specificUsersList?.length > 0 ? (
              settings.specificUsersList.map((username) => (
                <Badge
                  key={username}
                  variant={username.startsWith('@') ? "default" : "secondary"}
                  className="flex items-center gap-1"
                >
                  {username}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => removeFromListSetting('specificUsersList', username)}
                    title="Remove user"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))
            ) : (
              <div className="text-xs text-muted-foreground w-full text-center py-2">
                No users added yet. Add usernames below.
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Enter Twitch username"
              value={newSpecificUser}
              onChange={(e) => setNewSpecificUser(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newSpecificUser.trim()) {
                  addToListSetting('specificUsersList', newSpecificUser.trim());
                  setNewSpecificUser("");
                }
              }}
              disabled={!settings.specificUsersOnly}
            />
            <Button
              variant="outline"
              onClick={() => {
                if (newSpecificUser.trim()) {
                  addToListSetting('specificUsersList', newSpecificUser.trim());
                  setNewSpecificUser("");
                }
              }}
              disabled={!settings.specificUsersOnly}
              title="Add user"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            When specific users mode is enabled, TTS will only read messages from these users and any selected user groups above.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SpecificUsersSettings;
