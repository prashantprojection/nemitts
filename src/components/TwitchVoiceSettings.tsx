import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { UserVoiceAssignment } from "@/services/speech/types";
import speechService from "@/services/SpeechService";
import twitchService from "@/services/TwitchService";
import twitchAuthService from "@/services/twitch/TwitchAuthService";
import twitchUserListService from "@/services/twitch/TwitchUserListService";
import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import SearchableVoiceSelect from "@/components/ui/SearchableVoiceSelect";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TwitchVoiceSettingsProps {
  voices: SpeechSynthesisVoice[];
  userVoiceAssignments: UserVoiceAssignment[];
  onUpdateAssignments: (assignments: UserVoiceAssignment[]) => void;
}

const TwitchVoiceSettings = ({
  voices,
  userVoiceAssignments,
  onUpdateAssignments
}: TwitchVoiceSettingsProps) => {
  // State for Twitch user types - we don't need enable flags anymore

  // Voice selections
  const [subscriberVoice, setSubscriberVoice] = useState("");
  const [vipVoice, setVipVoice] = useState("");
  const [moderatorVoice, setModeratorVoice] = useState("");

  // Save status
  const [showSavedStatus, setShowSavedStatus] = useState(false);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Check if user is logged in to Twitch
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check if user has all required permissions
  const [hasRequiredPermissions, setHasRequiredPermissions] = useState(true);
  const [missingScopes, setMissingScopes] = useState<string[]>([]);

  useEffect(() => {
    // Check if user is logged in to Twitch
    const authState = twitchAuthService.getAuthState();
    const loggedIn = !!authState.accessToken && authState.isLoggedIn;
    setIsLoggedIn(loggedIn);

    // Check if user has all required permissions
    if (loggedIn) {
      const hasPermissions = twitchUserListService.checkRequiredPermissions();
      setHasRequiredPermissions(hasPermissions);

      // Get missing scopes for detailed information
      const missing = twitchUserListService.getMissingScopes();
      setMissingScopes(missing);
    }

    // Find existing user type assignments
    const subscriberAssignment = userVoiceAssignments.find(a => a.username === '@subscriber');
    const vipAssignment = userVoiceAssignments.find(a => a.username === '@vip');
    const moderatorAssignment = userVoiceAssignments.find(a => a.username === '@moderator');

    // Set initial states - just set the voice name if it exists
    if (subscriberAssignment) {
      setSubscriberVoice(subscriberAssignment.voiceName);
    } else {
      setSubscriberVoice("default");
    }

    if (vipAssignment) {
      setVipVoice(vipAssignment.voiceName);
    } else {
      setVipVoice("default");
    }

    if (moderatorAssignment) {
      setModeratorVoice(moderatorAssignment.voiceName);
    } else {
      setModeratorVoice("default");
    }
  }, [userVoiceAssignments]);

  // Add a listener for auth state changes
  useEffect(() => {
    const handleAuthStateChange = (state: any) => {
      const loggedIn = !!state.accessToken && state.isLoggedIn;
      setIsLoggedIn(loggedIn);

      // Check if user has all required permissions
      if (loggedIn) {
        const hasPermissions = twitchUserListService.checkRequiredPermissions();
        setHasRequiredPermissions(hasPermissions);

        // Get missing scopes for detailed information
        const missing = twitchUserListService.getMissingScopes();
        setMissingScopes(missing);
      }
    };

    // Add the listener
    twitchAuthService.addStateChangeListener(handleAuthStateChange);

    // Remove the listener when the component unmounts
    return () => {
      twitchAuthService.removeStateChangeListener(handleAuthStateChange);
    };
  }, []);

  const handleReauthenticate = () => {
    // Log out and then log back in to get the required permissions
    twitchAuthService.logout();
    setTimeout(() => {
      twitchAuthService.login();
    }, 500);
  };

  const saveUserTypeVoices = async () => {
    setIsSaving(true);

    try {
      // Create a copy of the current assignments
      const updatedAssignments = [...userVoiceAssignments];

      // Handle subscriber voice
      const subscriberIndex = updatedAssignments.findIndex(a => a.username === '@subscriber');
      if (subscriberVoice && subscriberVoice !== 'default') {
        const subscriberAssignment: UserVoiceAssignment = {
          username: '@subscriber',
          voiceName: subscriberVoice,
          userType: 'subscriber',
          priority: 10
        };

        if (subscriberIndex >= 0) {
          updatedAssignments[subscriberIndex] = subscriberAssignment;
        } else {
          updatedAssignments.push(subscriberAssignment);
        }
      } else if (subscriberIndex >= 0) {
        // Remove if voice is not selected or set to default
        updatedAssignments.splice(subscriberIndex, 1);
      }

      // Handle VIP voice
      const vipIndex = updatedAssignments.findIndex(a => a.username === '@vip');
      if (vipVoice && vipVoice !== 'default') {
        const vipAssignment: UserVoiceAssignment = {
          username: '@vip',
          voiceName: vipVoice,
          userType: 'vip',
          priority: 20
        };

        if (vipIndex >= 0) {
          updatedAssignments[vipIndex] = vipAssignment;
        } else {
          updatedAssignments.push(vipAssignment);
        }
      } else if (vipIndex >= 0) {
        // Remove if voice is not selected or set to default
        updatedAssignments.splice(vipIndex, 1);
      }

      // Handle moderator voice
      const moderatorIndex = updatedAssignments.findIndex(a => a.username === '@moderator');
      if (moderatorVoice && moderatorVoice !== 'default') {
        const moderatorAssignment: UserVoiceAssignment = {
          username: '@moderator',
          voiceName: moderatorVoice,
          userType: 'moderator',
          priority: 30
        };

        if (moderatorIndex >= 0) {
          updatedAssignments[moderatorIndex] = moderatorAssignment;
        } else {
          updatedAssignments.push(moderatorAssignment);
        }
      } else if (moderatorIndex >= 0) {
        // Remove if voice is not selected or set to default
        updatedAssignments.splice(moderatorIndex, 1);
      }

      // Remove any existing general voice assignment as we're now using the default voice settings
      const generalIndex = updatedAssignments.findIndex(a => a.username === '@general');
      if (generalIndex >= 0) {
        updatedAssignments.splice(generalIndex, 1);
      }

      // Update the assignments
      onUpdateAssignments(updatedAssignments);

      toast.success("Twitch voice settings saved");

      // Show saved status for visual feedback
      setShowSavedStatus(true);
      setTimeout(() => {
        setShowSavedStatus(false);
      }, 3000);
    } catch (error) {
      toast.error("Failed to save Twitch voice settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Twitch User Type Voices</CardTitle>
          <CardDescription>
            Log in to Twitch to assign voices to different user types
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <Button onClick={() => twitchAuthService.login()}>
              Log in with Twitch
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Twitch User Type Voices</CardTitle>
        <CardDescription>
          Assign different voices to Twitch user types (subscribers, VIPs, etc.)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Permission Warning */}
        {!hasRequiredPermissions && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex flex-col gap-2">
              <p>Missing required Twitch permissions. Some features may not work correctly.</p>
              <p className="text-xs text-muted-foreground mt-1">
                The application needs permissions to access Twitch VIPs, moderators, and subscribers lists.
                Please re-authenticate to grant all necessary permissions for full functionality.
              </p>
              {missingScopes.length > 0 && (
                <div className="text-xs text-muted-foreground mt-1 bg-muted/50 p-2 rounded max-h-24 overflow-y-auto">
                  <p className="font-medium mb-1">Missing permissions:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {missingScopes.slice(0, 5).map((scope, index) => (
                      <li key={index}>{scope}</li>
                    ))}
                    {missingScopes.length > 5 && (
                      <li>...and {missingScopes.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleReauthenticate}
                className="self-start mt-2"
              >
                Re-authenticate with Full Permissions
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {/* Subscriber Voice */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="subscriber-voice" className="flex items-center gap-2">
              Subscriber Voice
              {showSavedStatus && subscriberVoice && (
                <span className="text-xs text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium">
                  Saved
                </span>
              )}
            </Label>
            <p className="text-xs text-muted-foreground">
              Assign a specific voice to all subscribers in your channel
            </p>
          </div>
          <SearchableVoiceSelect
            voices={voices}
            value={subscriberVoice}
            onValueChange={setSubscriberVoice}
            placeholder="Select a voice for subscribers"
            id="subscriber-voice"
            showSavedStatus={showSavedStatus}
          />
          {subscriberVoice && (
            <p className="text-xs text-muted-foreground mt-1">
              Currently using: <span className="font-medium">{subscriberVoice}</span>
            </p>
          )}
        </div>

        {/* VIP Voice */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="vip-voice" className="flex items-center gap-2">
              VIP Voice
              {showSavedStatus && vipVoice && (
                <span className="text-xs text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium">
                  Saved
                </span>
              )}
            </Label>
            <p className="text-xs text-muted-foreground">
              Assign a specific voice to all VIPs in your channel
            </p>
          </div>
          <SearchableVoiceSelect
            voices={voices}
            value={vipVoice}
            onValueChange={setVipVoice}
            placeholder="Select a voice for VIPs"
            id="vip-voice"
            showSavedStatus={showSavedStatus}
          />
          {vipVoice && (
            <p className="text-xs text-muted-foreground mt-1">
              Currently using: <span className="font-medium">{vipVoice}</span>
            </p>
          )}
        </div>

        {/* Moderator Voice */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="moderator-voice" className="flex items-center gap-2">
              Moderator Voice
              {showSavedStatus && moderatorVoice && (
                <span className="text-xs text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium">
                  Saved
                </span>
              )}
            </Label>
            <p className="text-xs text-muted-foreground">
              Assign a specific voice to all moderators in your channel
            </p>
          </div>
          <SearchableVoiceSelect
            voices={voices}
            value={moderatorVoice}
            onValueChange={setModeratorVoice}
            placeholder="Select a voice for moderators"
            id="moderator-voice"
            showSavedStatus={showSavedStatus}
          />
          {moderatorVoice && (
            <p className="text-xs text-muted-foreground mt-1">
              Currently using: <span className="font-medium">{moderatorVoice}</span>
            </p>
          )}
        </div>

        {/* Note about Default Voice */}
        <div className="p-4 bg-muted/30 rounded-md border border-dashed mt-6">
          <h4 className="text-sm font-medium mb-1">About General Audience Voice</h4>
          <p className="text-xs text-muted-foreground">
            The default voice settings from the "Voice" tab are used for all viewers who don't have a specific voice assigned.
          </p>
        </div>

        <div className="pt-4 border-t">
          <Button
            onClick={saveUserTypeVoices}
            disabled={isSaving}
            className={`w-full transition-all duration-300 ${showSavedStatus ? 'bg-green-600 hover:bg-green-700' : ''}`}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {showSavedStatus ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-none" />
                Voice Settings Saved!
              </>
            ) : (
              'Save Twitch Voice Settings'
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>Priority order: Individual user assignments &gt; Moderators &gt; VIPs &gt; Subscribers &gt; Default voice</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TwitchVoiceSettings;
