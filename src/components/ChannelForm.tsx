
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import twitchAuthService from "@/services/twitch/TwitchAuthService";
import twitchUserListService from "@/services/twitch/TwitchUserListService";
import { toast } from "sonner";

interface ChannelFormProps {
  defaultChannel?: string | null;
  onChannelChange?: (channelName: string) => void;
}

const ChannelForm = ({ defaultChannel, onChannelChange }: ChannelFormProps) => {
  const [channelName, setChannelName] = useState<string>(defaultChannel || "");
  const [isBroadcaster, setIsBroadcaster] = useState<boolean>(false);
  const [isModerator, setIsModerator] = useState<boolean>(false);

  // Notify parent component when channel name changes
  useEffect(() => {
    onChannelChange?.(channelName.trim());
  }, [channelName, onChannelChange]);

  // Check user role in the channel
  useEffect(() => {
    const checkUserRole = async () => {
      if (channelName.trim()) {
        // Check if user is broadcaster
        const broadcaster = await twitchUserListService.isBroadcaster();
        setIsBroadcaster(broadcaster);

        // Check if user is moderator
        const moderator = await twitchUserListService.isCurrentUserModerator();
        setIsModerator(moderator);
      }
    };

    // Only check if we have a valid channel name and user is logged in
    const authState = twitchAuthService.getAuthState();
    if (channelName.trim() && authState.accessToken) {
      checkUserRole();
    }
  }, [channelName]);

  // Update channel name in auth service when it changes
  const handleChannelChange = (value: string) => {
    // Remove any # prefix from the input
    const cleanValue = value.replace(/^#/, '');
    setChannelName(cleanValue);

    const trimmedValue = cleanValue.trim();

    if (trimmedValue) {
      console.log(`ChannelForm: Setting channel name to "${trimmedValue}"`);
      twitchAuthService.setChannelName(trimmedValue);

      // Show a toast notification to confirm the channel change
      if (trimmedValue !== defaultChannel) {
        toast.info(`Channel set to #${trimmedValue}`);
      }
    } else if (cleanValue === '') {
      // Clear the channel name if the input is empty
      console.log('ChannelForm: Clearing channel name');
      twitchAuthService.setChannelName('');
    }
  };

  const isLoggedIn = twitchAuthService.getAuthState().isLoggedIn;

  return (
    <div className="flex items-center w-full max-w-md">
      <div className="flex items-center gap-2 w-full bg-card/70 rounded-md border border-border/50 px-3 py-1.5 shadow-md">
        <span className="text-muted-foreground font-medium text-sm">Channel:</span>
        <div className="flex items-center w-full relative">
          <span className="text-primary mr-1 font-medium">#</span>
          <Input
            id="channel-name"
            placeholder={isLoggedIn ? "Enter Twitch channel name" : "Enter channel name to listen to"}
            value={channelName}
            onChange={(e) => handleChannelChange(e.target.value)}
            className="flex-1 h-8 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground text-foreground"
          />
        </div>
        {channelName.trim() && twitchAuthService.getAuthState().accessToken && (
          <Badge
            variant={isBroadcaster ? "default" : isModerator ? "secondary" : "outline"}
            className={`ml-2 ${isBroadcaster ? 'bg-primary hover:bg-primary/90' : isModerator ? 'bg-green-600 hover:bg-green-700' : 'border-border bg-card/50 text-muted-foreground'}`}
          >
            {isBroadcaster ? "Owner" : isModerator ? "Moderator" : "Viewer"}
          </Badge>
        )}
      </div>
    </div>
  );
};

export default ChannelForm;
