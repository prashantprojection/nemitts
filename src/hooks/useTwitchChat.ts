import { useState, useEffect, useCallback } from 'react';
import twitchService, { TwitchMessage } from '@/services/TwitchService';
import twitchAuthService from '@/services/TwitchAuthService';
import speechService from '@/services/SpeechService';
import { supabase } from '@/integrations/supabase/client';

/**
 * A hook for managing Twitch chat
 *
 * @param isMuted Whether TTS is muted
 * @returns Twitch chat state and functions to manage it
 */
export function useTwitchChat(isMuted: boolean) {
  const [messages, setMessages] = useState<TwitchMessage[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Function to show notifications in the status bar instead of toast
  const showStatusNotification = (type: 'info' | 'success' | 'error', message: string) => {
    // Dispatch a custom event that the StatusBar component will listen for
    window.dispatchEvent(new CustomEvent('status-notification', {
      detail: { type, message }
    }));
  };

  // Handle new messages
  const handleNewMessage = useCallback(async (message: TwitchMessage) => {
    setMessages(prev => [...prev, message]);

    // Save message to Supabase if user is logged in
    const authState = twitchAuthService.getAuthState();
    if (authState.isLoggedIn && authState.channelName) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const shouldRead = !isMuted && await speechService.shouldReadMessage(message.message, message.username);
          const { error } = await supabase.from('chat_messages').insert({
            user_id: user.id,
            channel_name: authState.channelName,
            twitch_message_id: message.id || '',
            username: message.username || '',
            message: message.message,
            was_read: shouldRead
          });

          if (error) {
            console.error("Error saving message:", error);
          }
        }
      } catch (err) {
        console.error("Error saving message:", err);
      }
    }

    // Process with TTS if not muted and message should be read
    if (!isMuted) {
      const shouldRead = await speechService.shouldReadMessage(message.message, message.username);
      if (shouldRead) {
        console.log(`Reading message from ${message.displayName}`);
        const ttsText = speechService.formatMessageForSpeech(message.displayName, message.message);

        // Calculate message priority based on filter settings
        const priority = speechService.calculateMessagePriority(message.message, message.username);

        // Speak with username, message ID, and calculated priority
        speechService.speak(ttsText, priority, message.username || '', message.id || '');
      }
    }
  }, [isMuted]);

  // Set up message handler on component mount
  useEffect(() => {
    twitchService.setMessageCallback(handleNewMessage);

    // Check connection status on component mount
    setIsConnected(twitchService.isConnected());

    // Clean up when component unmounts
    return () => {
      twitchService.disconnect();
    };
  }, [handleNewMessage]);

  // Connect to Twitch chat
  const connectToChat = () => {
    const authState = twitchAuthService.getAuthState();
    if (!authState.isLoggedIn || !authState.accessToken || !authState.channelName) {
      showStatusNotification('error', "Please log in and set a channel name first");
      return;
    }

    const credentials = {
      accessToken: authState.accessToken,
      username: authState.username || '',
      channelName: authState.channelName
    };

    twitchService.connect(credentials);
    setIsConnected(true);
    showStatusNotification('success', `Connected to ${authState.channelName}'s chat`);
  };

  // Disconnect from Twitch chat
  const disconnectFromChat = () => {
    twitchService.disconnect();
    setIsConnected(false);
    showStatusNotification('info', "Disconnected from chat");
  };

  // Clear messages
  const clearMessages = () => {
    setMessages([]);
    speechService.stop();
    showStatusNotification('info', "Messages cleared");
  };

  return {
    messages,
    isConnected,
    connectToChat,
    disconnectFromChat,
    clearMessages
  };
}
