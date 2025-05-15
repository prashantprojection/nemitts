import { toast } from "sonner";
import twitchAuthService from "./twitch/TwitchAuthService";
import twitchProfileService from "./twitch/TwitchProfileService";

export interface TwitchCredentials {
  accessToken: string;
  username: string;
  channelName: string;
}

// Removed TwitchEmote interface

export interface TwitchMessage {
  id?: string;
  username?: string;
  displayName: string;
  message: string;
  color: string;
  timestamp: number; // Unix timestamp in milliseconds
  badges?: string[];
  // emotes property removed
  profileImageUrl?: string;
  isModerator?: boolean;
  isSubscriber?: boolean;
  isVip?: boolean;
  isFirstMsg?: boolean;
  hasFlags?: boolean;
  channelName?: string; // Channel name where the message was sent
}

export class TwitchService {
  private socket: WebSocket | null = null;
  private channel: string = "";
  private credentials: TwitchCredentials | null = null;
  private messageCallback: ((message: TwitchMessage) => void) | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private joinConfirmed: boolean = false;

  // Public getter for socket existence
  public get hasSocket(): boolean {
    return this.socket !== null;
  }

  // Get current channel name
  public getCurrentChannel(): string | null {
    return this.channel || null;
  }

  constructor() {
    this.socket = null;
  }

  public setMessageCallback(callback: (message: TwitchMessage) => void): void {
    this.messageCallback = callback;
  }

  public connect(credentials: TwitchCredentials): void {
    try {
      // Validate credentials
      if (!credentials.accessToken) {
        toast.error("Missing access token - please log in again");
        return;
      }

      if (!credentials.username) {
        toast.error("Missing username - please log in again");
        return;
      }

      if (!credentials.channelName) {
        toast.error("Please enter a channel name before connecting");
        return;
      }

      // Trim the channel name and remove any # prefix
      credentials.channelName = credentials.channelName.trim().replace(/^#/, '');

      if (credentials.channelName === '') {
        toast.error("Channel name cannot be empty");
        return;
      }

      console.log(`[TwitchService] Connecting to ${credentials.channelName}'s chat with username ${credentials.username}...`);

      this.credentials = credentials;
      this.channel = credentials.channelName.toLowerCase();

      // Close any existing connection
      if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
        this.socket.close();
        this.socket = null;
      }

      // Dispatch an initial connecting event
      const connectingEvent = new CustomEvent('twitch-connection-change', {
        detail: {
          connected: false,
          connecting: true,
          channel: this.channel
        }
      });
      window.dispatchEvent(connectingEvent);
      console.log(`[TwitchService] Dispatched connecting event for ${this.channel}`);

      // Create a new WebSocket connection
      this.socket = new WebSocket('wss://irc-ws.chat.twitch.tv');

      // Set up event handlers
      this.socket.onopen = () => {
        this.handleOpen();

        // Set a connection timeout - if we don't get a successful JOIN within 30 seconds, disconnect
        this.connectionTimeout = setTimeout(() => {
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            toast.error(`Connection timeout. Failed to join #${this.channel}'s chat.`);
            this.disconnect();
          }
        }, 30000); // 30 seconds timeout
      };

      this.socket.onmessage = (event) => {
        try {
          this.handleMessage(event);
        } catch (error) {
          console.error('Error handling Twitch message:', error);
          // Don't disconnect on message handling errors
          // This prevents the TTS from disconnecting when processing long messages
        }
      };

      this.socket.onerror = (error) => {
        console.error('Twitch chat connection error:', error);
        toast.error("Twitch chat connection error");
        this.disconnect();
      };

      this.socket.onclose = (event) => {
        // Only show disconnection message if it wasn't intentional
        if (event.code !== 1000) {
          console.log(`WebSocket closed with code ${event.code}`);
          toast.info("Disconnected from Twitch chat");
        }

        this.socket = null;
      };
    } catch (error) {
      console.error('Failed to connect to Twitch chat:', error);
      toast.error("Failed to connect to Twitch chat");
    }
  }

  public disconnect(): void {
    console.log('[TwitchService] Disconnecting from Twitch chat');

    // Clear any connection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    // Reset join confirmation flag
    this.joinConfirmed = false;

    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
      // Use code 1000 for normal closure (intentional disconnect)
      this.socket.close(1000, "User initiated disconnect");
      this.socket = null;

      // Dispatch connection change event
      const connectionEvent = new CustomEvent('twitch-connection-change', {
        detail: {
          connected: false,
          channel: this.channel
        }
      });
      window.dispatchEvent(connectionEvent);
    }
  }

  public isConnected(): boolean {
    const connected = this.socket !== null && this.socket.readyState === WebSocket.OPEN;

    // Also check if we've received a successful JOIN confirmation
    const fullyConnected = connected && this.joinConfirmed;

    console.log(`[TwitchService] isConnected check: ${fullyConnected}, socket: ${this.socket ? 'exists' : 'null'}, readyState: ${this.socket?.readyState}, joinConfirmed: ${this.joinConfirmed}`);

    return fullyConnected;
  }

  /**
   * Get the current channel name
   * @returns string The current channel name or empty string if not connected
   */
  public getChannel(): string {
    return this.channel || '';
  }

  public sendMessage(message: string): boolean {
    // Validate connection before sending
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.credentials || !this.channel) {
      toast.error("Not connected to chat");
      return false;
    }

    try {
      // Send the PRIVMSG command to the channel
      const messageCommand = `PRIVMSG #${this.channel} :${message}`;
      this.socket.send(messageCommand);

      // Set up a listener for message sending errors
      const handleMessageError = (event: MessageEvent) => {
        const errorMessage = event.data.toString().trim();

        // Check for specific error messages
        if ((errorMessage.includes('NOTICE #') && errorMessage.includes('Your message was not sent')) ||
            errorMessage.includes('followers-only') ||
            errorMessage.includes('follow the channel') ||
            errorMessage.includes('msg-followersonly')) {
          // Handle follower-only mode errors
          if (errorMessage.includes('followers-only') ||
              errorMessage.includes('follow the channel') ||
              errorMessage.includes('msg-followersonly')) {

            toast.error("You need to follow this channel to chat");

            // Dispatch both a chat restriction event and a follower-only mode event
            // The follower-only mode event is specifically for the ChatInput component
            const restrictionEvent = new CustomEvent('twitch-chat-restriction', {
              detail: {
                type: 'follower_only',
                message: 'This channel is in follower-only mode',
                channel: this.channel
              }
            });
            window.dispatchEvent(restrictionEvent);

            // Also dispatch a follower-only mode event for the ChatInput component
            const followerOnlyEvent = new CustomEvent('twitch-follower-only-mode', {
              detail: {
                channel: this.channel,
                isFollowerOnly: true
              }
            });
            window.dispatchEvent(followerOnlyEvent);
          }
          // Handle subscriber-only mode errors
          else if (errorMessage.includes('subscribers-only')) {
            toast.error("You need to be a subscriber to chat");

            // Dispatch a chat restriction event
            const restrictionEvent = new CustomEvent('twitch-chat-restriction', {
              detail: {
                type: 'subscriber_only',
                message: 'This channel is in subscriber-only mode',
                channel: this.channel
              }
            });
            window.dispatchEvent(restrictionEvent);
          }
          // Handle emote-only mode errors
          else if (errorMessage.includes('emote-only')) {
            toast.error("This channel is in emote-only mode");

            // Dispatch a chat restriction event
            const restrictionEvent = new CustomEvent('twitch-chat-restriction', {
              detail: {
                type: 'emote_only',
                message: 'This channel is in emote-only mode',
                channel: this.channel
              }
            });
            window.dispatchEvent(restrictionEvent);
          }
          // Handle slow mode errors
          else if (errorMessage.includes('slow mode')) {
            toast.error("This channel is in slow mode. Please wait before sending another message.");

            // Dispatch a chat restriction event
            const restrictionEvent = new CustomEvent('twitch-chat-restriction', {
              detail: {
                type: 'slow_mode',
                message: 'This channel is in slow mode',
                channel: this.channel
              }
            });
            window.dispatchEvent(restrictionEvent);
          }
          // Handle other errors
          else {
            toast.error("Your message could not be sent. Please try again.");
          }

          // Remove the listener after handling the error
          if (this.socket) {
            this.socket.removeEventListener('message', handleMessageError);
          }

          return false;
        }

        // Remove the listener after a short delay
        setTimeout(() => {
          if (this.socket) {
            this.socket.removeEventListener('message', handleMessageError);
          }
        }, 5000);
      };

      // Add the error listener
      if (this.socket) {
        this.socket.addEventListener('message', handleMessageError);
      }

      // Create a local message to display immediately
      if (this.messageCallback) {
        const localMessage: TwitchMessage = {
          id: `local-${Date.now()}`,
          username: this.credentials.username.toLowerCase(),
          displayName: this.credentials.username,
          message: message,
          color: this.getRandomColor(this.credentials.username.toLowerCase()),
          timestamp: Date.now(),
          badges: [],
          // emotes property removed
          profileImageUrl: twitchAuthService.getAuthState().profileImageUrl || `https://static-cdn.jtvnw.net/user-default-pictures-uv/ebe4cd89-b4f4-4cd9-adac-2f30151b4209-profile_image-70x70.png`,
          isModerator: false,
          isSubscriber: false,
          isVip: false,
          channelName: this.channel // Add channel name to the message
        };

        this.messageCallback(localMessage);
      }

      return true;
    } catch (error) {
      toast.error("Failed to send message");
      return false;
    }
  }

  private handleOpen(): void {
    try {
      if (!this.socket || !this.credentials || !this.credentials.accessToken) {
        toast.error("Cannot authenticate with Twitch - missing credentials");
        return;
      }

      console.log(`[TwitchService] WebSocket opened, authenticating with Twitch for channel #${this.channel}...`);

      // Follow Twitch's recommended connection sequence
      // 1. Request capabilities first
      this.socket.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership');
      console.log(`[TwitchService] Requested capabilities`);

      // 2. Send authentication
      this.socket.send(`PASS oauth:${this.credentials.accessToken}`);
      console.log(`[TwitchService] Sent authentication`);

      // 3. Set nickname
      this.socket.send(`NICK ${this.credentials.username.toLowerCase()}`);
      console.log(`[TwitchService] Set nickname to ${this.credentials.username.toLowerCase()}`);

      // 4. Join channel
      if (!this.channel) {
        toast.error("Cannot join channel - no channel name provided");
        this.socket.close(1000, "No channel name");
        return;
      }

      this.socket.send(`JOIN #${this.channel}`);
      console.log(`[TwitchService] Sent JOIN command for #${this.channel}`);
      toast.info(`Joining #${this.channel}'s chat...`);

      // Send a test PING after a short delay
      setTimeout(() => {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send("PING :tmi.twitch.tv");
          console.log(`[TwitchService] Sent test PING`);
        }
      }, 2000);
    } catch (error) {
      console.error('[TwitchService] Error in handleOpen:', error);
      toast.error("Failed to connect to Twitch chat");
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = event.data.trim();

      // Handle PING/PONG to keep connection alive
      if (message.startsWith('PING') || message === 'PING :tmi.twitch.tv') {
        if (this.socket) this.socket.send('PONG :tmi.twitch.tv');
        return;
      }

      // Handle connection errors
      if (message.includes('Error connecting to server') ||
          message.includes('Connection failed') ||
          message.includes('Error logging in') ||
          message.includes('timed out')) {
        toast.error('Failed to connect to Twitch chat server');
        this.disconnect();
        return;
      }

      // Handle connection success messages
      if (message.includes('001') || message.includes('CAP * ACK')) {
        // Connection is confirmed, we can consider ourselves connected
        if (this.connectionTimeout) {
          // Clear the timeout since we've received some confirmation
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;

          // Set a new timeout to consider the connection successful after 5 seconds
          // if we don't get an explicit JOIN confirmation
          setTimeout(() => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
              // If we haven't received a JOIN confirmation after 5 seconds,
              // but we're still connected, assume we're joined
              if (!this.joinConfirmed) {
                this.joinConfirmed = true;
                toast.success(`Connected to ${this.channel}'s chat`);

                // Dispatch connection change event
                const connectionEvent = new CustomEvent('twitch-connection-change', {
                  detail: {
                    connected: true,
                    channel: this.channel
                  }
                });
                window.dispatchEvent(connectionEvent);
              }
            }
          }, 5000);
        }
        return;
      }

      // Handle successful JOIN confirmation
      if (message.includes('JOIN #') && (message.includes(`#${this.channel}`) || message.toLowerCase().includes(this.channel.toLowerCase()))) {
        toast.success(`Connected to ${this.channel}'s chat`);

        // Set the join confirmation flag
        this.joinConfirmed = true;

        // Clear the connection timeout since we've successfully joined
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }

        // Dispatch connection change event
        const connectionEvent = new CustomEvent('twitch-connection-change', {
          detail: {
            connected: true,
            channel: this.channel
          }
        });
        window.dispatchEvent(connectionEvent);
        console.log(`[TwitchService] Dispatched connection event: Connected to ${this.channel}`);

        return;
      }

      // Handle channel not found or other join failures
      if (message.includes('NOTICE #') ||
          message.includes('NOTICE * :Error joining channel') ||
          message.includes('No such channel') ||
          message.includes('Error connecting to IRC server')) {

        if (message.includes('No such channel')) {
          toast.error(`Channel #${this.channel} not found or doesn't exist`);
        } else if (message.includes('Error connecting to IRC server')) {
          toast.error(`Error connecting to Twitch chat server. Please try again later.`);
        } else if (message.includes('authentication failed')) {
          toast.error(`Authentication failed. Please log out and log in again.`);
        } else {
          toast.error(`Error joining channel #${this.channel}. Please check the channel name and try again.`);
        }

        // Disconnect on error
        this.disconnect();
        return;
      }

      // Handle chat restrictions (follower-only, sub-only, etc.)
      if (message.includes('NOTICE #') && message.includes('This room is now in')) {
        let restrictionType = '';
        let restrictionMessage = '';

        if (message.includes('followers-only')) {
          restrictionType = 'follower_only';
          restrictionMessage = 'This channel is in follower-only mode';

          // Try to extract the follow time requirement
          const followTimeMatch = message.match(/followers-only mode \((\d+\w+)\)/);
          if (followTimeMatch && followTimeMatch[1]) {
            restrictionMessage += ` (must follow for ${followTimeMatch[1]})`;
          }
        } else if (message.includes('subscribers-only')) {
          restrictionType = 'subscriber_only';
          restrictionMessage = 'This channel is in subscriber-only mode';
        } else if (message.includes('emote-only')) {
          restrictionType = 'emote_only';
          restrictionMessage = 'This channel is in emote-only mode';
        } else if (message.includes('slow mode')) {
          restrictionType = 'slow_mode';
          const slowModeMatch = message.match(/slow mode \((\d+\w+)\)/);
          if (slowModeMatch && slowModeMatch[1]) {
            restrictionMessage = `This channel is in slow mode (${slowModeMatch[1]} between messages)`;
          } else {
            restrictionMessage = 'This channel is in slow mode';
          }
        } else if (message.includes('r9k mode')) {
          restrictionType = 'r9k_mode';
          restrictionMessage = 'This channel is in R9K mode (unique messages only)';
        }

        if (restrictionType) {
          // Dispatch a chat restriction event
          const restrictionEvent = new CustomEvent('twitch-chat-restriction', {
            detail: {
              type: restrictionType,
              message: restrictionMessage,
              channel: this.channel
            }
          });
          window.dispatchEvent(restrictionEvent);
          console.log(`[TwitchService] Dispatched chat restriction event: ${restrictionType} for ${this.channel}`);

          // Show a toast notification
          toast.info(restrictionMessage);
        }
      }

      // Handle chat restriction removal
      if (message.includes('NOTICE #') && message.includes('This room is no longer in')) {
        let restrictionType = '';
        let restrictionMessage = '';

        if (message.includes('followers-only')) {
          restrictionType = 'follower_only_off';
          restrictionMessage = 'Follower-only mode has been turned off';
        } else if (message.includes('subscribers-only')) {
          restrictionType = 'subscriber_only_off';
          restrictionMessage = 'Subscriber-only mode has been turned off';
        } else if (message.includes('emote-only')) {
          restrictionType = 'emote_only_off';
          restrictionMessage = 'Emote-only mode has been turned off';
        } else if (message.includes('slow mode')) {
          restrictionType = 'slow_mode_off';
          restrictionMessage = 'Slow mode has been turned off';
        } else if (message.includes('r9k mode')) {
          restrictionType = 'r9k_mode_off';
          restrictionMessage = 'R9K mode has been turned off';
        }

        if (restrictionType) {
          // Dispatch a chat restriction removal event
          const restrictionEvent = new CustomEvent('twitch-chat-restriction', {
            detail: {
              type: restrictionType,
              message: null,
              channel: this.channel
            }
          });
          window.dispatchEvent(restrictionEvent);
          console.log(`[TwitchService] Dispatched chat restriction removal event: ${restrictionType} for ${this.channel}`);

          // Show a toast notification
          toast.info(restrictionMessage);
        }
      }

      // Handle authentication failures
      if (message.includes('NOTICE * :Login authentication failed') ||
          message.includes('NOTICE * :Improperly formatted auth') ||
          message.includes('NOTICE * :Invalid NICK')) {
        toast.error('Twitch authentication failed. Please log in again.');
        this.disconnect(); // Disconnect on auth failure
        return;
      }

      // Parse private messages (chat messages)
      if (message.includes('PRIVMSG')) {
        try {
          const parsedMessage = this.parseMessage(message);
          if (parsedMessage) {
            // Process the message in a try-catch block to prevent errors from breaking the connection
            try {
              // Call the message callback if set
              if (this.messageCallback) {
                this.messageCallback(parsedMessage);
              }

              // Dispatch a custom event for the message
              // Include the channel name in the event detail to ensure messages go to the right channel
              const messageEvent = new CustomEvent('twitch-message', {
                detail: {
                  ...parsedMessage,
                  channelName: this.channel // Add channel name to the event
                }
              });
              window.dispatchEvent(messageEvent);

              console.log(`[TwitchService] Dispatched message event for ${parsedMessage.username} in channel ${this.channel}`);
            } catch (callbackError) {
              console.error('Error in message callback:', callbackError);
              // Don't disconnect on callback errors
            }
          }
        } catch (parseError) {
          console.error('Error parsing Twitch message:', parseError, '\nMessage:', message);
          // Silent catch - parsing errors shouldn't affect the chat connection
        }
      }
    } catch (error) {
      // Catch any unexpected errors to prevent WebSocket from closing
      console.error('Unexpected error handling Twitch message:', error);
    }
  }

  private handleError(): void {
    // Check if we have credentials before showing error
    if (this.credentials && this.credentials.accessToken) {
      toast.error("Twitch chat connection error");
    } else {
      toast.error("Cannot connect to Twitch - missing credentials");
    }

    // Clean up the socket
    if (this.socket) {
      try {
        this.socket.close();
      } catch (e) {
        // Silent catch - closing errors shouldn't block the cleanup
      }
      this.socket = null;
    }
  }

  private handleClose(event: CloseEvent): void {
    // Only show disconnection message if it wasn't intentional
    // Code 1000 is normal closure (intentional disconnect)
    if (event.code !== 1000) {
      toast.info("Disconnected from Twitch chat");
    }

    // Clean up resources
    this.socket = null;
  }

  private parseMessage(rawMessage: string): TwitchMessage | null {
    try {

      // Example of IRC message with tags:
      // @badge-info=;badges=moderator/1,partner/1;color=#5B99FF;...;user-type=mod :ronni!ronni@ronni.tmi.twitch.tv PRIVMSG #channel :Hello, world!

      // Handle different message formats
      let username = '';
      let message = '';
      let tags: Record<string, string> = {};

      // Parse tags if present
      const tagsMatch = rawMessage.match(/@([^ ]+) /);
      if (tagsMatch) {
        tags = tagsMatch[1].split(';').reduce((acc: Record<string, string>, tag) => {
          const parts = tag.split('=');
          if (parts.length === 2) {
            acc[parts[0]] = parts[1];
          }
          return acc;
        }, {});
        // Parse tags
      }

      // Parse message content - try multiple regex patterns to handle different formats
      let messageMatch = rawMessage.match(/ PRIVMSG #[^ ]+ :(.+)$/);
      if (!messageMatch) {
        messageMatch = rawMessage.match(/PRIVMSG #[^ ]+ :(.+)$/);
      }

      if (messageMatch) {
        message = messageMatch[1];
      } else {
        return null;
      }

      // Parse username - first check for display-name in tags
      if (tags['display-name']) {
        username = tags['display-name'];
      } else {
        // Try to extract from IRC format
        const userRegex = /:([^!]+)!/;
        const userMatch = rawMessage.match(userRegex);
        if (userMatch) {
          username = userMatch[1].toLowerCase();
        } else {
          // Fallback for system messages or other formats
          const altUserMatch = rawMessage.match(/:([^ ]+) /);
          if (altUserMatch) {
            username = altUserMatch[1].toLowerCase();
          } else {
            username = 'anonymous';
          }
        }
      }

      // Extract user-type if present
      if (tags['user-type']) {
        console.log(`[TwitchService] Found user-type: ${tags['user-type']}`);
      }

      // Extract other information
      const displayName = tags['display-name'] || username;
      const color = tags['color'] || this.getRandomColor(username);
      const badges = tags['badges'] ? tags['badges'].split(',').filter(badge => badge !== '') : [];
      const id = tags['id'] || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Extract badge information
      const isModerator = badges.some(badge => badge.startsWith('moderator/'));
      const isSubscriber = badges.some(badge => badge.startsWith('subscriber/'));
      const isVip = badges.some(badge => badge.startsWith('vip/'));

      // Initialize with empty profile image URL - we'll use fallback in UI
      let profileImageUrl = '';

      // If it's the current user, try to get from auth service first
      if (username === this.credentials?.username?.toLowerCase()) {
        profileImageUrl = twitchAuthService.getAuthState().profileImageUrl || '';
      }

      // Create a unique message ID
      const messageId = id;

      // Fetch profile image asynchronously and update later
      this.fetchProfileImage(username).then(url => {
        if (url) {
          // Update profile image URL
          profileImageUrl = url;

          // Create an update event with the profile image
          const profileUpdateEvent = new CustomEvent('twitch-profile-update', {
            detail: {
              messageId,
              username,
              profileImageUrl: url,
              channelName: this.channel // Add channel name to the event
            }
          });

          // Dispatch event to update UI
          window.dispatchEvent(profileUpdateEvent);

          console.log(`[TwitchService] Dispatched profile update for ${username}`);
        }
      }).catch(error => {
        console.error(`[TwitchService] Error fetching profile for ${username}:`, error);
      });

      // Emote parsing code removed

      // Check for first message and flags
      const isFirstMsg = tags['first-msg'] === '1';
      const hasFlags = tags['flags'] && tags['flags'].length > 0;

      if (isFirstMsg) {
        console.log(`[TwitchService] First message from user: ${displayName}`);
      }

      if (hasFlags) {
        console.log(`[TwitchService] Message has flags: ${tags['flags']}`);
      }

      // Create the message object
      const twitchMessage: TwitchMessage = {
        id,
        username,
        displayName,
        message,
        color,
        timestamp: new Date(),
        badges,
        // emotes property removed
        profileImageUrl,
        isModerator,
        isSubscriber,
        isVip,
        isFirstMsg,
        hasFlags,
        channelName: this.channel // Add channel name to the message
      };

      console.log(`[TwitchService] Created message from ${username} with profile: ${profileImageUrl}`);

      return twitchMessage;
    } catch (error) {
      return null;
    }
  }

  private getRandomColor(username: string): string {
    // Generate a color based on username to keep it consistent
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Convert to hex color
    const hue = Math.abs(hash % 360);
    // Twitch-like saturated colors
    return `hsl(${hue}, 80%, 60%)`;
  }

  /**
   * Fetch a user's profile image URL
   * @param username The Twitch username
   * @returns Promise<string> The profile image URL
   */
  private async fetchProfileImage(username: string): Promise<string> {
    try {
      // Force refresh to get the latest profile image
      const profile = await twitchProfileService.getUserProfile(username, true);

      if (profile?.profileImageUrl) {
        console.log(`[TwitchService] Successfully fetched profile image for ${username}: ${profile.profileImageUrl}`);
        return profile.profileImageUrl;
      } else {
        console.log(`[TwitchService] No profile image found for ${username}`);
        return '';
      }
    } catch (error) {
      console.error(`[TwitchService] Error fetching profile for ${username}:`, error);
      return '';
    }
  }
}

// Create a singleton instance
const twitchService = new TwitchService();
export default twitchService;
