import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import '@/styles/chat-scrollbar.css';
import ChatBubble from '@/components/ChatBubble';
import ChatInput from '@/components/ChatInput';
import { useSession } from '@/contexts/SessionContext';
import twitchAuthService from '@/services/twitch/TwitchAuthService';
import twitchStreamService from '@/services/twitch/TwitchStreamService';
import twitchProfileService from '@/services/twitch/TwitchProfileService';
import { useChatAppearance } from '@/contexts/ChatAppearanceContext';
import speechService from '@/services/SpeechService';
import { useTheme } from '@/contexts/ThemeContext';
import { useSpeechService } from '@/contexts/SpeechServiceContext';

// Define a type for chat messages
interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: Date;
  isModerator?: boolean;
  isVIP?: boolean;
  isSubscriber?: boolean;
  profileImage?: string;
  isMuted?: boolean;
}

const ChatContainer = () => {
  const { channelName } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, ChatMessage[]>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const [isChannelLive, setIsChannelLive] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const speechService = useSpeechService();

  // Get current channel's messages
  const currentMessages = channelName ? (messagesByChannel[channelName.toLowerCase()] || []) : [];

  // Debug log to show which channel's messages we're displaying
  useEffect(() => {
    console.log(`[ChatContainer] Displaying messages for channel: ${channelName}, count: ${currentMessages.length}`);
  }, [channelName, currentMessages]);

  // Connect to Twitch chat when component mounts
  useEffect(() => {
    console.log('[ChatContainer] Initializing chat container...');

    // Initialize speech service
    speechService.initialize();

    // Set up event listener for Twitch messages
    const handleTwitchMessage = (event: CustomEvent) => {
      const twitchMessage = event.detail;

      // Get the message's channel name
      const messageChannelName = twitchMessage.channelName?.toLowerCase();

      // Skip messages that don't have a channel name
      if (!messageChannelName) {
        console.log(`[ChatContainer] Skipping message with no channel name`);
        return;
      }

      console.log(`[ChatContainer] Received message for channel ${messageChannelName}: "${twitchMessage.message}" from ${twitchMessage.username}`);

      // Convert Twitch message to our ChatMessage format
      const chatMessage: ChatMessage = {
        id: twitchMessage.id || Date.now().toString(),
        username: twitchMessage.username,
        message: twitchMessage.message,
        timestamp: new Date(),
        isModerator: twitchMessage.badges?.moderator === '1',
        isVIP: twitchMessage.badges?.vip === '1',
        isSubscriber: twitchMessage.badges?.subscriber === '1',
        profileImage: twitchMessage.profileImageUrl || '',
      };

      console.log(`[ChatContainer] Processed message from ${chatMessage.username} for channel ${messageChannelName}`);

      // Add message to the specific channel's message list
      setMessagesByChannel(prev => ({
        ...prev,
        [messageChannelName]: [...(prev[messageChannelName] || []), chatMessage]
      }));

      // Process with TTS if enabled
      if (isTTSEnabled) {
        processTTS(chatMessage, twitchMessage.displayName);
      }
    };

    // Process TTS for a message
    const processTTS = async (chatMessage: ChatMessage, displayName?: string) => {
      try {
        const authState = twitchAuthService.getAuthState();
        const loggedInUsername = authState.username?.toLowerCase();
        const currentChannelName = channelName?.toLowerCase();
        const messageUsername = chatMessage.username.toLowerCase();

        // Only process TTS if the message is from the channel owner
        if (loggedInUsername && currentChannelName === loggedInUsername && messageUsername === loggedInUsername) {
          // Check general filters (like blocked words, etc.)
          const shouldReadBasedOnFilters = await speechService.shouldReadMessage(chatMessage.message, chatMessage.username);

          if (shouldReadBasedOnFilters) {
            // Format the message for speech
            const ttsText = speechService.formatMessageForSpeech(
              displayName || chatMessage.username,
              chatMessage.message
            );

            // Speak the message with high priority since it's from the channel owner
            speechService.speak(ttsText, 3, chatMessage.username, chatMessage.id);
          }
        }
      } catch (error) {
        console.error('[ChatContainer] Error processing TTS for message:', error);
      }
    };

    // Set up event listener for connection status
    const handleConnectionStatus = (event: CustomEvent) => {
      const { connected } = event.detail;
      console.log(`[ChatContainer] Connection status: ${connected ? 'Connected' : 'Disconnected'}`);
      setIsConnected(connected);
    };

    // Handle profile image updates
    const handleProfileUpdate = async (event: CustomEvent) => {
      const { messageId, username, profileImageUrl, channelName: messageChannelName } = event.detail;

      if (!messageChannelName || !username) return;

      console.log(`[ChatContainer] Received profile update for ${username} in channel ${messageChannelName}`);

      // Get the profile from our service
      const profile = await twitchProfileService.getUserProfile(username);

      // Use the profile image from our service if available
      const finalProfileImageUrl = profile?.profileImageUrl || profileImageUrl || '';

      // Update profile image for matching messages in the specific channel
      setMessagesByChannel(prev => {
        const updated = { ...prev };

        const channelKey = messageChannelName.toLowerCase();
        if (updated[channelKey]) {
          updated[channelKey] = updated[channelKey].map(msg => {
            if ((messageId && msg.id === messageId) || (!messageId && msg.username.toLowerCase() === username.toLowerCase())) {
              return { ...msg, profileImage: finalProfileImageUrl };
            }
            return msg;
          });
        }

        return updated;
      });
    };

    // Add event listeners
    window.addEventListener('twitch-message', handleTwitchMessage as EventListener);
    window.addEventListener('twitch-connection-change', handleConnectionStatus as EventListener);
    window.addEventListener('twitch-profile-update', handleProfileUpdate as EventListener);

    // Connect to Twitch chat if we have a channel name
    const connectToTwitch = async () => {
      if (channelName) {
        const authState = twitchAuthService.getAuthState();

        if (authState.isLoggedIn && authState.accessToken) {
          try {
            // Create credentials object
            const credentials = {
              accessToken: authState.accessToken,
              username: authState.username || 'anonymous',
              channelName: channelName.trim()
            };

            // Import TwitchService
            const module = await import('@/services/TwitchService');
            const twitchService = module.default;

            // Check if already connected to the right channel
            if (!twitchService.isConnected() || twitchService.getChannel() !== channelName.trim().toLowerCase()) {
              console.log(`[ChatContainer] Connecting to ${channelName} chat...`);

              // Disconnect first to ensure a clean connection
              if (twitchService.isConnected()) {
                console.log(`[ChatContainer] Disconnecting from current chat before connecting to ${channelName}...`);
                twitchService.disconnect();

                // Wait a moment before connecting
                await new Promise(resolve => setTimeout(resolve, 500));
              }

              twitchService.connect(credentials);
              setIsConnected(true);

              console.log(`[ChatContainer] Connection initiated to ${channelName} chat`);
            } else {
              console.log(`[ChatContainer] Already connected to ${channelName} chat`);
              setIsConnected(true);
            }
          } catch (error) {
            console.error('[ChatContainer] Error connecting to Twitch chat:', error);
            setIsConnected(false);
          }
        } else {
          console.log('[ChatContainer] Not logged in or missing access token');
          setIsConnected(false);
        }
      } else {
        console.log('[ChatContainer] No channel name provided');
        setIsConnected(false);
      }
    };

    // Connect to Twitch with a slight delay to ensure everything is initialized
    setTimeout(connectToTwitch, 500);

    // Check if channel is live
    const checkLiveStatus = async () => {
      if (channelName) {
        try {
          const isLive = await twitchStreamService.isChannelLive(channelName);
          setIsChannelLive(isLive);
        } catch (error) {
          console.error('Error checking live status:', error);
        }
      }
    };

    // Check immediately and then every 60 seconds
    checkLiveStatus();
    const interval = setInterval(checkLiveStatus, 60000);

    return () => {
      // Remove event listeners
      window.removeEventListener('twitch-message', handleTwitchMessage as EventListener);
      window.removeEventListener('twitch-connection-change', handleConnectionStatus as EventListener);
      window.removeEventListener('twitch-profile-update', handleProfileUpdate as EventListener);

      // Clear interval
      clearInterval(interval);

      // Disconnect from Twitch chat
      import('@/services/TwitchService').then(module => {
        const twitchService = module.default;
        if (twitchService.isConnected()) {
          console.log('[ChatContainer] Disconnecting from Twitch chat');
          twitchService.disconnect();
        }
      });
    };
  }, [channelName, isTTSEnabled]);

  // Function to clear messages for a specific channel
  const clearChannelMessages = (channel: string) => {
    if (!channel) return;

    const channelKey = channel.toLowerCase();
    setMessagesByChannel(prev => {
      const updated = { ...prev };
      delete updated[channelKey];
      return updated;
    });

    console.log(`[ChatContainer] Cleared messages for channel: ${channel}`);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  }, [currentMessages]);

  // Get chat appearance settings
  const { chatStyle, messageAlignment } = useChatAppearance();

  // Determine padding based on chat style
  const getPadding = () => {
    switch (chatStyle) {
      case 'whatsapp':
      case 'telegram':
        return 'px-4';
      case 'discord':
        return 'px-3';
      default:
        return 'px-2';
    }
  };

  return (
    <div className="flex flex-col h-full chat-container relative">
      {/* Chat header - fixed at top */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center">
          <div className="flex flex-col">
            <div className="flex items-center">
              <h2 className="text-sm font-medium">{channelName || 'Chat'}</h2>
              <div className={`ml-2 w-2 h-2 rounded-full ${isChannelLive ? 'bg-green-500' : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
              {currentMessages.length > 0 && (
                <button
                  className="ml-2 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => channelName && clearChannelMessages(channelName)}
                  title="Clear messages"
                >
                  (clear)
                </button>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {currentMessages.length} messages{isChannelLive ? ' • Live' : ''}
            </span>
          </div>
        </div>

        <Button
          variant={isTTSEnabled ? "default" : "outline"}
          size="sm"
          className={`h-8 rounded-full transition-all duration-200 ${
            isTTSEnabled
              ? 'bg-green-500 hover:bg-green-600 text-white shadow-md border-green-600'
              : 'bg-red-100 text-red-600 hover:bg-red-200 border border-red-300'
          }`}
          onClick={() => {
            const newState = !isTTSEnabled;
            setIsTTSEnabled(newState);
            speechService.setMuteState(!newState);

            if (!newState) {
              speechService.stop();
            }
          }}
        >
          {isTTSEnabled ? (
            <>
              <Mic className="h-4 w-4 mr-2" />
              <span>TTS On</span>
            </>
          ) : (
            <>
              <MicOff className="h-4 w-4 mr-2" />
              <span>TTS Off</span>
            </>
          )}
        </Button>
      </div>

      {/* Chat messages area - only this should scroll */}
      <div className="flex-1 flex flex-col relative chat-messages-area">
        {/* Scrollable chat messages container */}
        <div
          className="flex-1 chat-scroll-area"
          ref={scrollAreaRef}
          style={{
            height: 'calc(100vh - 180px)',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <div className={`flex flex-col py-2 ${getPadding()} max-w-3xl mx-auto w-full`}>
            {/* Deduplicate messages by using a Set of message IDs */}
            {currentMessages
              .filter((msg, index, self) =>
                // Keep only the first occurrence of each message ID
                index === self.findIndex(m => m.id === msg.id)
              )
              .map(msg => {
                // Determine message alignment
                const alignClass = messageAlignment === 'left' ? 'justify-start' :
                                  messageAlignment === 'right' ? 'justify-end' :
                                  (msg.isModerator || msg.isVIP) ? 'justify-end' : 'justify-start';

                // For WhatsApp and Telegram styles, we need to add some spacing
                const isSpecialStyle = chatStyle === 'whatsapp' || chatStyle === 'telegram';
                const spacingClass = isSpecialStyle ? 'px-3' : '';

                return (
                  <div key={msg.id} className={`flex w-full ${alignClass} ${spacingClass} mb-2`}>
                    <ChatBubble
                      username={msg.username}
                      message={msg.message}
                      timestamp={msg.timestamp}
                      isCurrentUser={false}
                      isModerator={msg.isModerator || false}
                      isVIP={msg.isVIP || false}
                      isSubscriber={msg.isSubscriber || false}
                      profileImage={msg.profileImage}
                    />
                  </div>
                );
              })
            }
            {/* Add an empty div at the bottom to scroll to */}
            <div id="chat-bottom" className="h-1 w-full" />
          </div>
        </div>
      </div>

      {/* Chat input - fixed at bottom */}
      <div className="sticky bottom-0 left-0 right-0 z-10">
        <ChatInput
          channelName={channelName || ''}
          isConnected={isConnected}
        />
      </div>
    </div>
  );
};

export default ChatContainer;
