import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { UserCheck, X, Plus, Info, Volume2 } from "lucide-react";
import { useFilterSettingsContext } from "@/hooks/useFilterSettingsContext";
import twitchAuthService from "@/services/twitch/TwitchAuthService";
import speechService from "@/services/SpeechService";
import { UserVoiceAssignment } from "@/services/speech/types";

const AllowedUsersGrid = () => {
  const {
    settings,
    updateSetting,
    addToListSetting,
    removeFromListSetting
  } = useFilterSettingsContext();

  // State for new specific user
  const [newSpecificUser, setNewSpecificUser] = useState("");
  const [isLoggedInToTwitch, setIsLoggedInToTwitch] = useState(false);
  const [enableSubscribers, setEnableSubscribers] = useState(false);
  const [enableVips, setEnableVips] = useState(false);
  const [enableModerators, setEnableModerators] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState({
    subscribers: false,
    vips: false,
    moderators: false
  });
  const [isBroadcaster, setIsBroadcaster] = useState(false);
  const [isModerator, setIsModerator] = useState(false);

  // Voice assignment states
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [userVoiceAssignments, setUserVoiceAssignments] = useState<UserVoiceAssignment[]>([]);
  const [subscriberVoice, setSubscriberVoice] = useState("");
  const [vipVoice, setVipVoice] = useState("");
  const [moderatorVoice, setModeratorVoice] = useState("");

  // Check Twitch login status
  useEffect(() => {
    const checkTwitchAuth = async () => {
      const authState = twitchAuthService.getAuthState();
      setIsLoggedInToTwitch(authState.isLoggedIn);

      // Check if user is broadcaster or moderator
      if (authState.isLoggedIn && authState.userInfo) {
        setIsBroadcaster(authState.userInfo.broadcaster);
        setIsModerator(authState.userInfo.moderator);
      }
    };

    checkTwitchAuth();
  }, []);

  // Check for special user groups in the specific users list
  useEffect(() => {
    // Make sure specificUsersList is an array before checking includes
    const usersList = Array.isArray(settings.specificUsersList) ? settings.specificUsersList : [];

    setEnableSubscribers(usersList.includes('@subscribers') || false);
    setEnableVips(usersList.includes('@vips') || false);
    setEnableModerators(usersList.includes('@moderators') || false);

    // Check permission status
    const checkUserStatus = () => {
      setPermissionStatus({
        subscribers: isBroadcaster || false,
        vips: isBroadcaster || isModerator || false,
        moderators: isBroadcaster || false
      });
    };

    checkUserStatus();
  }, [settings.specificUsersList, isBroadcaster, isModerator]);

  // Load voice assignments
  useEffect(() => {
    const loadVoiceSettings = async () => {
      try {
        // Load available voices
        setVoices(speechService.getVoices());

        // Load user voice assignments
        const options = await speechService.getOptions();
        if (options.userVoiceAssignments && options.userVoiceAssignments.length > 0) {
          setUserVoiceAssignments(options.userVoiceAssignments);

          // Extract Twitch group voices
          const subscriberAssignment = options.userVoiceAssignments.find(a => a.username === '@subscribers');
          const vipAssignment = options.userVoiceAssignments.find(a => a.username === '@vips');
          const moderatorAssignment = options.userVoiceAssignments.find(a => a.username === '@moderators');

          if (subscriberAssignment) setSubscriberVoice(subscriberAssignment.voiceName);
          if (vipAssignment) setVipVoice(vipAssignment.voiceName);
          if (moderatorAssignment) setModeratorVoice(moderatorAssignment.voiceName);
        }
      } catch (error) {
        console.error("Error loading voice settings:", error);
      }
    };

    loadVoiceSettings();
  }, []);

  // Handle toggling subscribers
  const handleToggleSubscribers = (checked: boolean) => {
    setEnableSubscribers(checked);

    if (checked && !settings.specificUsersList?.includes('@subscribers')) {
      addToListSetting('specificUsersList', '@subscribers');
    } else if (!checked && settings.specificUsersList?.includes('@subscribers')) {
      removeFromListSetting('specificUsersList', '@subscribers');
    }
  };

  // Handle toggling VIPs
  const handleToggleVips = (checked: boolean) => {
    setEnableVips(checked);

    if (checked && !settings.specificUsersList?.includes('@vips')) {
      addToListSetting('specificUsersList', '@vips');
    } else if (!checked && settings.specificUsersList?.includes('@vips')) {
      removeFromListSetting('specificUsersList', '@vips');
    }
  };

  // Handle toggling moderators
  const handleToggleModerators = (checked: boolean) => {
    setEnableModerators(checked);

    if (checked && !settings.specificUsersList?.includes('@moderators')) {
      addToListSetting('specificUsersList', '@moderators');
    } else if (!checked && settings.specificUsersList?.includes('@moderators')) {
      removeFromListSetting('specificUsersList', '@moderators');
    }
  };

  // Handle adding a specific user
  const handleAddSpecificUser = () => {
    if (newSpecificUser.trim()) {
      addToListSetting('specificUsersList', newSpecificUser.trim());
      setNewSpecificUser("");
    }
  };

  // Handle Twitch voice change
  const handleTwitchVoiceChange = async (group: string, voiceName: string) => {
    // Find the voice object
    const voice = voices.find(v => v.name === voiceName);
    if (!voice) return;

    try {
      // Update state
      switch (group) {
        case 'subscribers':
          setSubscriberVoice(voiceName);
          break;
        case 'vips':
          setVipVoice(voiceName);
          break;
        case 'moderators':
          setModeratorVoice(voiceName);
          break;
      }

      // Get current options
      const options = await speechService.getOptions();
      const currentAssignments = [...(options.userVoiceAssignments || [])];

      // Check if this group already has an assignment
      const existingIndex = currentAssignments.findIndex(a => a.username === `@${group}`);

      if (existingIndex >= 0) {
        // Update existing assignment
        currentAssignments[existingIndex] = {
          ...currentAssignments[existingIndex],
          voiceName
        };
      } else {
        // Add new assignment
        currentAssignments.push({
          username: `@${group}`,
          voiceName,
          rate: 1,
          pitch: 1,
          volume: 1
        });
      }

      // Update assignments in state
      setUserVoiceAssignments(currentAssignments);

      // Save to speech service
      await speechService.setOptions({
        ...options,
        userVoiceAssignments: currentAssignments
      });

      // Save settings
      await speechService.saveSettings({
        ...options,
        userVoiceAssignments: currentAssignments
      });
    } catch (error) {
      console.error(`Error setting ${group} voice:`, error);
    }
  };

  // Test voice
  const testVoice = (group: string) => {
    let voiceName = "";
    switch (group) {
      case 'subscribers':
        voiceName = subscriberVoice;
        break;
      case 'vips':
        voiceName = vipVoice;
        break;
      case 'moderators':
        voiceName = moderatorVoice;
        break;
    }

    if (!voiceName) return;

    speechService.speak(`This is a test of ${group} voice.`, {
      voice: speechService.getVoiceByName(voiceName),
      rate: 1,
      pitch: 1,
      volume: 1
    });
  };

  return (
    <div className="space-y-6 w-full">
      {/* Allowed Users Mode Panel */}
      <div className="card p-6 border rounded-lg bg-card shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
            <UserCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-medium">Allowed Users Mode</h3>
              <span className="text-xs px-1.5 py-0.5 rounded-sm bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                Experimental
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Control which users can trigger TTS</p>
          </div>
        </div>

        <div className="flex items-center justify-between bg-muted/30 p-3 rounded-md border">
          <div className="flex-1 max-w-md">
            <Label htmlFor="specific-users-only" className="font-medium block">
              Enable Allowed Users Mode
            </Label>
            <p className="text-xs text-muted-foreground mt-1 truncate" title="When enabled, TTS will only read messages from users you select">
              When enabled, TTS will only read messages from users you select
            </p>
          </div>
          <Switch
            id="specific-users-only"
            checked={settings.specificUsersOnly}
            onCheckedChange={(checked) => updateSetting('specificUsersOnly', checked)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Twitch User Groups Panel */}
        <div className="card p-6 border rounded-lg bg-card shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-medium">Twitch User Groups</h3>
              <p className="text-sm text-muted-foreground">Allow specific Twitch user groups</p>
            </div>
          </div>

          <div className="space-y-4">
            {!isLoggedInToTwitch ? (
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
            ) : (
              <div className="space-y-3">
                <div className="p-3 border rounded-md">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">M</span>
                      </div>
                      <div>
                        <Label htmlFor="moderators-toggle" className="font-medium">Moderators</Label>
                        <p className="text-xs text-muted-foreground truncate" title="Allow all moderators to trigger TTS">Allow all moderators to trigger TTS</p>
                      </div>
                    </div>
                    <Switch
                      id="moderators-toggle"
                      checked={enableModerators}
                      onCheckedChange={handleToggleModerators}
                      disabled={!permissionStatus.moderators || !settings.specificUsersOnly}
                    />
                  </div>

                  {enableModerators && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Volume2 className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="moderator-voice" className="text-sm">Moderator Voice</Label>
                      </div>
                      <div className="flex gap-2">
                        <select
                          id="moderator-voice"
                          className="flex-1 p-2 text-sm border rounded-md bg-background"
                          value={moderatorVoice}
                          onChange={(e) => handleTwitchVoiceChange('moderators', e.target.value)}
                          disabled={!enableModerators || !settings.specificUsersOnly}
                        >
                          <option value="">Select a voice</option>
                          {voices.map(voice => (
                            <option key={voice.name} value={voice.name}>
                              {voice.name} ({voice.lang})
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => testVoice('moderators')}
                          disabled={!moderatorVoice || !enableModerators || !settings.specificUsersOnly}
                          title="Test voice"
                        >
                          <Volume2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 border rounded-md">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <span className="text-xs font-bold text-green-600 dark:text-green-400">V</span>
                      </div>
                      <div>
                        <Label htmlFor="vips-toggle" className="font-medium">VIPs</Label>
                        <p className="text-xs text-muted-foreground truncate" title="Allow all VIPs to trigger TTS">Allow all VIPs to trigger TTS</p>
                      </div>
                    </div>
                    <Switch
                      id="vips-toggle"
                      checked={enableVips}
                      onCheckedChange={handleToggleVips}
                      disabled={!permissionStatus.vips || !settings.specificUsersOnly}
                    />
                  </div>

                  {enableVips && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Volume2 className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="vip-voice" className="text-sm">VIP Voice</Label>
                      </div>
                      <div className="flex gap-2">
                        <select
                          id="vip-voice"
                          className="flex-1 p-2 text-sm border rounded-md bg-background"
                          value={vipVoice}
                          onChange={(e) => handleTwitchVoiceChange('vips', e.target.value)}
                          disabled={!enableVips || !settings.specificUsersOnly}
                        >
                          <option value="">Select a voice</option>
                          {voices.map(voice => (
                            <option key={voice.name} value={voice.name}>
                              {voice.name} ({voice.lang})
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => testVoice('vips')}
                          disabled={!vipVoice || !enableVips || !settings.specificUsersOnly}
                          title="Test voice"
                        >
                          <Volume2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 border rounded-md">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <span className="text-xs font-bold text-purple-600 dark:text-purple-400">$</span>
                      </div>
                      <div>
                        <Label htmlFor="subscribers-toggle" className="font-medium">Subscribers</Label>
                        <p className="text-xs text-muted-foreground truncate" title="Allow all subscribers to trigger TTS">Allow all subscribers to trigger TTS</p>
                      </div>
                    </div>
                    <Switch
                      id="subscribers-toggle"
                      checked={enableSubscribers}
                      onCheckedChange={handleToggleSubscribers}
                      disabled={!permissionStatus.subscribers || !settings.specificUsersOnly}
                    />
                  </div>

                  {enableSubscribers && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Volume2 className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="subscriber-voice" className="text-sm">Subscriber Voice</Label>
                      </div>
                      <div className="flex gap-2">
                        <select
                          id="subscriber-voice"
                          className="flex-1 p-2 text-sm border rounded-md bg-background"
                          value={subscriberVoice}
                          onChange={(e) => handleTwitchVoiceChange('subscribers', e.target.value)}
                          disabled={!enableSubscribers || !settings.specificUsersOnly}
                        >
                          <option value="">Select a voice</option>
                          {voices.map(voice => (
                            <option key={voice.name} value={voice.name}>
                              {voice.name} ({voice.lang})
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => testVoice('subscribers')}
                          disabled={!subscriberVoice || !enableSubscribers || !settings.specificUsersOnly}
                          title="Test voice"
                        >
                          <Volume2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isLoggedInToTwitch && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md mt-4">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Note:</strong> Individual voice assignments will override Twitch user group assignments. The priority order is: Individual Assignments &gt; Moderators &gt; VIPs &gt; Subscribers.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Individual Users Panel */}
        <div className="card p-6 border rounded-lg bg-card shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-medium">Individual Users</h3>
              <p className="text-sm text-muted-foreground">Allow specific individual users</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 mb-2 min-h-[40px] p-2 border rounded-md bg-muted/20">
              {settings.specificUsersList?.filter(u => !u.startsWith('@')).length > 0 ? (
                settings.specificUsersList?.filter(u => !u.startsWith('@')).map((username) => (
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
                placeholder="Enter username to allow"
                value={newSpecificUser}
                onChange={(e) => setNewSpecificUser(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSpecificUser()}
                className="flex-1"
                disabled={!settings.specificUsersOnly}
              />
              <Button
                onClick={handleAddSpecificUser}
                size="icon"
                disabled={!newSpecificUser.trim() || !settings.specificUsersOnly}
                title="Add user"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              When specific users mode is enabled, TTS will only read messages from these users and any selected user groups above.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllowedUsersGrid;
