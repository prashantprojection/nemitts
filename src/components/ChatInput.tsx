import { useState, KeyboardEvent, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Lock } from "lucide-react";
import twitchAuthService from "@/services/twitch/TwitchAuthService";
import twitchService from "@/services/TwitchService";
import { toast } from "sonner";

interface ChatInputProps {
  channelName: string;
  isConnected: boolean;
}

const ChatInput = ({ channelName, isConnected }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [chatRestriction, setChatRestriction] = useState<string | null>(null);
  const [isFollowerOnly, setIsFollowerOnly] = useState(false);
  const [isFollowing, setIsFollowing] = useState(true); // Default to true until we check

  // Listen for chat restrictions and log connection status
  useEffect(() => {
    console.log(`[ChatInput] Channel: ${channelName}, Connected: ${isConnected}, TwitchService connected: ${twitchService.isConnected()}`);

    // Listen for chat restrictions
    const handleChatRestriction = (event: CustomEvent) => {
      const { type, message } = event.detail;
      console.log(`[ChatInput] Chat restriction: ${type} - ${message}`);

      setChatRestriction(message);

      // Check if it's follower-only mode
      if (type === 'follower_only') {
        setIsFollowerOnly(true);
        // Check if the current user is following the channel
        checkFollowStatus();
      } else {
        setIsFollowerOnly(false);
      }
    };

    // Listen for connection status changes
    const handleConnectionChange = (event: CustomEvent) => {
      const { connected, channel } = event.detail;
      console.log(`[ChatInput] Connection status changed: ${connected ? 'Connected' : 'Disconnected'} to ${channel}`);
    };

    window.addEventListener('twitch-chat-restriction', handleChatRestriction as EventListener);
    window.addEventListener('twitch-connection-change', handleConnectionChange as EventListener);

    // Check follow status when channel changes
    if (channelName && isFollowerOnly) {
      checkFollowStatus();
    }

    return () => {
      window.removeEventListener('twitch-chat-restriction', handleChatRestriction as EventListener);
      window.removeEventListener('twitch-connection-change', handleConnectionChange as EventListener);
    };
  }, [channelName, isFollowerOnly, isConnected]);

  // Check if the user is following the channel
  const checkFollowStatus = async () => {
    try {
      const authState = twitchAuthService.getAuthState();
      if (!authState.isLoggedIn || !authState.accessToken || !channelName) {
        setIsFollowing(false);
        return;
      }

      // Check if we have the required scope
      const hasRequiredScope = authState.scopes?.includes('user:read:follows');
      if (!hasRequiredScope) {
        console.warn('[ChatInput] Missing required scope: user:read:follows');
        // Even without the scope, we'll try to send messages anyway
        // The server will reject if follower-only mode is active
        setIsFollowing(true);
        return;
      }

      // Import TwitchUserListService
      const module = await import('@/services/twitch/TwitchUserListService');
      const twitchUserListService = module.default;

      // Check if the user is following the channel
      const isFollowing = await twitchUserListService.isFollowing(channelName);
      setIsFollowing(isFollowing);

      console.log(`[ChatInput] User is ${isFollowing ? '' : 'not '}following ${channelName}`);

      // If not following, check if we're the broadcaster or a moderator
      // as they can always chat regardless of follower-only mode
      if (!isFollowing) {
        const isBroadcaster = authState.username?.toLowerCase() === channelName.toLowerCase();
        const isModerator = await twitchUserListService.isCurrentUserModerator();

        if (isBroadcaster || isModerator) {
          console.log(`[ChatInput] User is broadcaster or moderator, allowing chat`);
          setIsFollowing(true);
        }
      }
    } catch (error) {
      console.error('[ChatInput] Error checking follow status:', error);
      // On error, we'll try to send messages anyway
      // The server will reject if follower-only mode is active
      setIsFollowing(true);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    // Check if user is logged in
    const authState = twitchAuthService.getAuthState();
    if (!authState.isLoggedIn || !authState.accessToken) {
      toast.error("You need to log in with Twitch to send messages");
      return;
    }

    // Check if we're connected to chat
    if (!twitchService.isConnected()) {
      // Try to connect to chat
      console.log(`[ChatInput] Not connected to chat. Attempting to connect to ${channelName}...`);

      const credentials = {
        accessToken: authState.accessToken,
        username: authState.username || 'anonymous',
        channelName: channelName.trim()
      };

      // Disconnect first to ensure a clean connection
      twitchService.disconnect();

      // Connect with a slight delay
      twitchService.connect(credentials);
      toast.info(`Connecting to ${channelName}'s chat...`);

      // Wait a moment for the connection to establish
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Check if we're now connected
      if (!twitchService.isConnected()) {
        toast.error(`Could not connect to ${channelName}'s chat. Please try again.`);
        return;
      }
    }

    // Check if we can send the message (follower-only mode)
    if (isFollowerOnly && !isFollowing) {
      // Check follow status again to be sure
      await checkFollowStatus();

      // If still not following, show error
      if (!isFollowing) {
        toast.error("You need to follow this channel to chat");
        return;
      }
    }

    // Send message to Twitch chat
    console.log(`[ChatInput] Sending message to ${channelName}: ${message}`);
    const success = twitchService.sendMessage(message);

    if (success) {
      setMessage("");
    } else {
      console.error(`[ChatInput] Failed to send message to ${channelName}`);

      // If sending failed, check if we're still connected
      if (!twitchService.isConnected()) {
        toast.error("Lost connection to chat. Reconnecting...");

        // Try to reconnect
        const credentials = {
          accessToken: authState.accessToken,
          username: authState.username || 'anonymous',
          channelName: channelName.trim()
        };

        twitchService.connect(credentials);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage();
  };

  // Determine input placeholder based on connection status and restrictions
  const getPlaceholder = () => {
    if (!isConnected) return "Connect to chat first...";
    if (isFollowerOnly && !isFollowing) return "Follower-only mode - You need to follow this channel to chat";
    if (chatRestriction) return chatRestriction;
    return "Type a message...";
  };

  // Determine if input should be disabled
  const isInputDisabled = () => {
    if (!isConnected) return true;
    if (isFollowerOnly && !isFollowing) return true;
    return false;
  };

  // Debug function to check connection status
  const debugConnection = () => {
    const isConnectedTwitch = twitchService.isConnected();
    const currentChannel = twitchService.getChannel();
    const authState = twitchAuthService.getAuthState();

    console.log(`[ChatInput] Debug connection:
      - isConnected prop: ${isConnected}
      - TwitchService.isConnected(): ${isConnectedTwitch}
      - TwitchService.getChannel(): ${currentChannel}
      - Current channelName prop: ${channelName}
      - Auth state: ${authState.isLoggedIn ? 'Logged in' : 'Not logged in'}
      - Username: ${authState.username || 'None'}
      - Has token: ${authState.accessToken ? 'Yes' : 'No'}
    `);

    if (!authState.isLoggedIn || !authState.accessToken) {
      toast.error("You need to log in with Twitch first");
      return;
    }

    if (!channelName) {
      toast.error("No channel selected. Please select a channel first.");
      return;
    }

    toast.info(`Connection status: ${isConnectedTwitch ? 'Connected' : 'Disconnected'} to ${currentChannel || 'no channel'}`);

    // Try to reconnect if not connected
    if (!isConnectedTwitch && channelName) {
      const credentials = {
        accessToken: authState.accessToken,
        username: authState.username || 'anonymous',
        channelName: channelName.trim()
      };

      console.log(`[ChatInput] Attempting to reconnect to ${channelName}...`);

      // Disconnect first to ensure a clean connection
      twitchService.disconnect();

      // Connect with a slight delay
      setTimeout(() => {
        twitchService.connect(credentials);
        toast.info(`Reconnecting to ${channelName}...`);
      }, 500);
    }
  };

  return (
    <div className="p-3 border-t border-border bg-card/80 backdrop-blur-sm">
      <div className="flex flex-col gap-2">
        <form onSubmit={handleSubmit} className="flex gap-2 w-full items-center">
          {isFollowerOnly && !isFollowing && (
            <div className="flex items-center text-amber-500 mr-2">
              <Lock className="h-4 w-4 mr-1" />
              <span className="text-xs">Follower-only</span>
            </div>
          )}
          <Input
            placeholder={getPlaceholder()}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isInputDisabled()}
            className="flex-grow rounded-full shadow-sm focus-visible:ring-primary border-border/80 bg-background h-10 px-4"
            autoComplete="off"
          />
          <Button
            type="submit"
            disabled={isInputDisabled() || !message.trim()}
            size="icon"
            className="rounded-full bg-primary hover:bg-primary/90 shadow-sm transition-all hover:shadow-md h-10 w-10"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>

        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <div>
            {isConnected ?
              <span className="text-green-500">Connected to {channelName}</span> :
              <span className="text-red-500">Not connected to chat</span>
            }
          </div>
          {isFollowerOnly && !isFollowing && (
            <span className="text-amber-500 text-xs">
              You need to follow this channel to chat
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
