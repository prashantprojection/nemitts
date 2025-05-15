import { toast } from "sonner";
import twitchAuthService from "./TwitchAuthService";
import speechService from "@/services/SpeechService";
import { supabase } from "@/integrations/supabase/client";
import LocalStorageManager from "../LocalStorageManager";

interface ChannelPointsRedemption {
  id: string;
  user: {
    id: string;
    login: string;
    display_name: string;
  };
  reward: {
    id: string;
    title: string;
  };
  user_input: string;
  status: string;
}

interface BitsMessage {
  bits_used: number;
  chat_message: string;
  user_name: string;
  channel_name: string;
}

interface TwitchIntegrationSettings {
  channelPointsEnabled: boolean;
  channelPointsRewardId: string;
  channelPointsMessage: string;
  channelPointsRedemptionType: 'time' | 'messages';
  channelPointsTimeAmount: number;
  channelPointsTimeUnit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
  channelPointsMessageCount: number;
  channelPointsStackRedemptions: boolean;
  bitsEnabled: boolean;
  bitsMinimum: number;
  bitsMessage: string;
  bitsRedemptionType: 'time' | 'messages';
  bitsTimeAmount: number;
  bitsTimeUnit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
  bitsMessageCount: number;
  bitsStackRedemptions: boolean;
}

class TwitchPubSubService {
  private socket: WebSocket | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private settings: TwitchIntegrationSettings | null = null;
  private userId: string | null = null;
  private channelId: string | null = null;

  constructor() {
    // Load settings when service is initialized
    this.loadSettings();
  }

  private async loadSettings() {
    try {
      // First try to load from localStorage for immediate access
      try {
        const localSettings = localStorage.getItem('twitch_integration_settings');
        if (localSettings) {
          const parsedSettings = JSON.parse(localSettings);
          this.settings = {
            channelPointsEnabled: parsedSettings.channelPointsEnabled || false,
            channelPointsRewardId: parsedSettings.channelPointsRewardId || "",
            channelPointsMessage: parsedSettings.channelPointsMessage || "{username} redeemed channel points with message: {message}",
            channelPointsRedemptionType: parsedSettings.channelPointsRedemptionType || 'time',
            channelPointsTimeAmount: parsedSettings.channelPointsTimeAmount || 1,
            channelPointsTimeUnit: parsedSettings.channelPointsTimeUnit || 'hours',
            channelPointsMessageCount: parsedSettings.channelPointsMessageCount || 10,
            channelPointsStackRedemptions: parsedSettings.channelPointsStackRedemptions !== false,
            bitsEnabled: parsedSettings.bitsEnabled || false,
            bitsMinimum: parsedSettings.bitsMinimum || 100,
            bitsMessage: parsedSettings.bitsMessage || "{username} cheered {bits} bits with message: {message}",
            bitsRedemptionType: parsedSettings.bitsRedemptionType || 'time',
            bitsTimeAmount: parsedSettings.bitsTimeAmount || 1,
            bitsTimeUnit: parsedSettings.bitsTimeUnit || 'hours',
            bitsMessageCount: parsedSettings.bitsMessageCount || 10,
            bitsStackRedemptions: parsedSettings.bitsStackRedemptions !== false
          };
          return; // If we have local settings, use those and don't check Supabase
        }
      } catch (localError) {
        console.error("Error loading from localStorage:", localError);
      }

      // Only check Supabase if we don't have local settings
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('twitch_integration_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error loading Twitch integration settings:", error);
        return;
      }

      if (data) {
        this.settings = {
          channelPointsEnabled: data.channel_points_enabled || false,
          channelPointsRewardId: data.channel_points_reward_id || "",
          channelPointsMessage: data.channel_points_message || "{username} redeemed channel points with message: {message}",
          channelPointsRedemptionType: data.channel_points_redemption_type || 'time',
          channelPointsTimeAmount: data.channel_points_time_amount || 1,
          channelPointsTimeUnit: data.channel_points_time_unit || 'hours',
          channelPointsMessageCount: data.channel_points_message_count || 10,
          channelPointsStackRedemptions: data.channel_points_stack_redemptions !== false, // default to true
          bitsEnabled: data.bits_enabled || false,
          bitsMinimum: data.bits_minimum || 100,
          bitsMessage: data.bits_message || "{username} cheered {bits} bits with message: {message}",
          bitsRedemptionType: data.bits_redemption_type || 'time',
          bitsTimeAmount: data.bits_time_amount || 1,
          bitsTimeUnit: data.bits_time_unit || 'hours',
          bitsMessageCount: data.bits_message_count || 10,
          bitsStackRedemptions: data.bits_stack_redemptions !== false // default to true
        };

        // Update localStorage with the Supabase data
        localStorage.setItem('twitch_integration_settings', JSON.stringify(this.settings));
      }
    } catch (error) {
      console.error("Error loading Twitch integration settings:", error);
    }
  }

  public async connect() {
    // First, load the latest settings
    await this.loadSettings();

    // Check if we have the necessary settings
    if (!this.settings) {
      console.log("No Twitch integration settings found, not connecting to PubSub");
      return;
    }

    // Check if any integrations are enabled
    if (!this.settings.channelPointsEnabled && !this.settings.bitsEnabled) {
      console.log("No Twitch integrations enabled, not connecting to PubSub");
      return;
    }

    // Get auth state
    const authState = twitchAuthService.getAuthState();
    if (!authState.isLoggedIn || !authState.accessToken) {
      console.log("Not logged in to Twitch, cannot connect to PubSub");
      return;
    }

    // Get user ID if we don't have it
    if (!this.userId) {
      try {
        const response = await fetch('https://api.twitch.tv/helix/users', {
          headers: {
            'Authorization': `Bearer ${authState.accessToken}`,
            'Client-Id': import.meta.env.VITE_TWITCH_CLIENT_ID
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to get user info: ${response.status}`);
        }

        const data = await response.json();
        if (data.data && data.data.length > 0) {
          this.userId = data.data[0].id;
          this.channelId = data.data[0].id; // For broadcaster, these are the same
        }
      } catch (error) {
        console.error("Error getting Twitch user ID:", error);
        return;
      }
    }

    // Close existing connection if any
    this.disconnect();

    // Connect to PubSub
    this.socket = new WebSocket('wss://pubsub-edge.twitch.tv');

    this.socket.onopen = () => {
      console.log("Connected to Twitch PubSub");

      // Listen for channel points redemptions if enabled
      if (this.settings?.channelPointsEnabled && this.channelId) {
        this.listen(`channel-points-channel-v1.${this.channelId}`, authState.accessToken);
      }

      // Listen for bits events if enabled
      if (this.settings?.bitsEnabled && this.channelId) {
        this.listen(`channel-bits-events-v2.${this.channelId}`, authState.accessToken);
      }

      // Set up ping interval
      this.pingInterval = setInterval(() => {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ type: 'PING' }));
        }
      }, 250000); // Ping every 4 minutes
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        // Handle different message types
        switch (message.type) {
          case 'RESPONSE':
            if (message.error) {
              console.error("PubSub error:", message.error);
            }
            break;

          case 'MESSAGE':
            this.handlePubSubMessage(message);
            break;

          case 'RECONNECT':
            console.log("PubSub requested reconnect");
            this.reconnect();
            break;

          case 'PONG':
            // Ping response, nothing to do
            break;

          default:
            console.log("Unknown PubSub message type:", message.type);
        }
      } catch (error) {
        console.error("Error handling PubSub message:", error);
      }
    };

    this.socket.onerror = (error) => {
      console.error("PubSub WebSocket error:", error);
    };

    this.socket.onclose = () => {
      console.log("PubSub WebSocket closed");

      // Clear ping interval
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }

      // Attempt to reconnect after a delay
      this.reconnectTimeout = setTimeout(() => {
        this.connect();
      }, 5000);
    };
  }

  private listen(topic: string, token: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    const message = {
      type: 'LISTEN',
      data: {
        topics: [topic],
        auth_token: token
      }
    };

    this.socket.send(JSON.stringify(message));
  }

  private handlePubSubMessage(message: any) {
    if (!message.data || !message.data.topic || !message.data.message) return;

    const topic = message.data.topic;
    const messageData = JSON.parse(message.data.message);

    // Handle channel points redemptions
    if (topic.startsWith('channel-points-channel-v1.') && this.settings?.channelPointsEnabled) {
      this.handleChannelPointsRedemption(messageData);
    }

    // Handle bits events
    if (topic.startsWith('channel-bits-events-v2.') && this.settings?.bitsEnabled) {
      this.handleBitsEvent(messageData);
    }
  }

  private handleChannelPointsRedemption(data: any) {
    if (!data.redemption) return;

    const redemption: ChannelPointsRedemption = data.redemption;

    // Check if this is the reward we're looking for
    if (this.settings?.channelPointsRewardId &&
        redemption.reward.id === this.settings.channelPointsRewardId) {

      // Format the message
      let message = this.settings.channelPointsMessage;
      message = message.replace('{username}', redemption.user.display_name);
      message = message.replace('{message}', redemption.user_input || '');

      // Speak the message
      speechService.speak(message, 10); // High priority

      // Add the user to the allowed users list based on redemption type
      this.addUserToAllowedList(redemption.user.login, 'channel_points');

      console.log(`Channel points redeemed by ${redemption.user.display_name}: ${redemption.user_input}`);
    }
  }

  private handleBitsEvent(data: any) {
    if (!data.data) return;

    const bitsData: BitsMessage = data.data;

    // Check if it meets the minimum bits requirement
    if (this.settings?.bitsMinimum && bitsData.bits_used >= this.settings.bitsMinimum) {

      // Format the message
      let message = this.settings.bitsMessage;
      message = message.replace('{username}', bitsData.user_name);
      message = message.replace('{bits}', bitsData.bits_used.toString());
      message = message.replace('{message}', bitsData.chat_message || '');

      // Speak the message
      speechService.speak(message, 10); // High priority

      // Add the user to the allowed users list based on redemption type
      this.addUserToAllowedList(bitsData.user_name, 'bits');

      console.log(`${bitsData.user_name} cheered ${bitsData.bits_used} bits: ${bitsData.chat_message}`);
    }
  }

  /**
   * Add a user to the allowed users list based on redemption type
   */
  private async addUserToAllowedList(username: string, redemptionSource: 'channel_points' | 'bits') {
    try {
      // Get the current user's settings
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Determine which settings to use based on the redemption source
      const settings = redemptionSource === 'channel_points' ? {
        type: this.settings?.channelPointsRedemptionType,
        timeAmount: this.settings?.channelPointsTimeAmount,
        timeUnit: this.settings?.channelPointsTimeUnit,
        messageCount: this.settings?.channelPointsMessageCount,
        stackRedemptions: this.settings?.channelPointsStackRedemptions
      } : {
        type: this.settings?.bitsRedemptionType,
        timeAmount: this.settings?.bitsTimeAmount,
        timeUnit: this.settings?.bitsTimeUnit,
        messageCount: this.settings?.bitsMessageCount,
        stackRedemptions: this.settings?.bitsStackRedemptions
      };

      // Get existing user redemptions
      const { data: existingData, error: fetchError } = await supabase
        .from('user_redemptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('twitch_username', username.toLowerCase())
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching user redemption:', fetchError);
        return;
      }

      // Calculate expiration date for time-based redemptions
      let expiresAt = null;
      if (settings.type === 'time') {
        expiresAt = new Date();

        // Add time based on the unit
        switch(settings.timeUnit) {
          case 'minutes':
            expiresAt.setMinutes(expiresAt.getMinutes() + settings.timeAmount);
            break;
          case 'hours':
            expiresAt.setHours(expiresAt.getHours() + settings.timeAmount);
            break;
          case 'days':
            expiresAt.setDate(expiresAt.getDate() + settings.timeAmount);
            break;
          case 'weeks':
            expiresAt.setDate(expiresAt.getDate() + (settings.timeAmount * 7));
            break;
          case 'months':
            expiresAt.setMonth(expiresAt.getMonth() + settings.timeAmount);
            break;
        }
      }

      // If user already has a redemption and stacking is enabled
      if (existingData && settings.stackRedemptions) {
        let updatedExpiresAt = expiresAt;
        let updatedMessageCount = settings.messageCount;

        // For time-based redemptions, extend the expiration date
        if (settings.type === 'time' && existingData.expires_at) {
          const currentExpiry = new Date(existingData.expires_at);
          if (currentExpiry > new Date()) { // Only extend if not already expired
            // Calculate time difference to add
            const timeDiff = expiresAt!.getTime() - new Date().getTime();
            updatedExpiresAt = new Date(currentExpiry.getTime() + timeDiff);
          }
        }
        // For message-based redemptions, add to the message count
        else if (settings.type === 'messages') {
          updatedMessageCount = (existingData.messages_remaining || 0) + settings.messageCount;
        }

        // Update the existing redemption
        const updatedRedemption = {
          ...existingData,
          expires_at: settings.type === 'time' ? updatedExpiresAt : null,
          messages_remaining: settings.type === 'messages' ? updatedMessageCount : null,
          updated_at: new Date().toISOString()
        };

        const { error: updateError } = await supabase
          .from('user_redemptions')
          .update({
            expires_at: settings.type === 'time' ? updatedExpiresAt : null,
            messages_remaining: settings.type === 'messages' ? updatedMessageCount : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingData.id);

        if (updateError) {
          console.error('Error updating user redemption:', updateError);
        } else {
          // Update localStorage
          this.updateLocalRedemptions(updatedRedemption);
        }
      }
      // Create a new redemption
      else {
        // Create a new redemption
        const newRedemption = {
          user_id: user.id,
          twitch_username: username.toLowerCase(),
          redemption_type: settings.type,
          expires_at: settings.type === 'time' ? expiresAt : null,
          messages_remaining: settings.type === 'messages' ? settings.messageCount : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: insertData, error: insertError } = await supabase
          .from('user_redemptions')
          .insert(newRedemption)
          .select('id')
          .single();

        if (insertError) {
          console.error('Error creating user redemption:', insertError);
        } else if (insertData) {
          // Update localStorage with the new redemption including the ID
          this.updateLocalRedemptions({
            ...newRedemption,
            id: insertData.id
          });
        }
      }
    } catch (error) {
      console.error('Error managing user redemption:', error);
    }
  }

  /**
   * Update local redemptions in localStorage
   */
  private updateLocalRedemptions(redemption: any) {
    try {
      // Get existing redemptions
      const existingRedemptions = LocalStorageManager.loadUserRedemptions() || [];

      // Find if this redemption already exists
      const existingIndex = existingRedemptions.findIndex(r => r.id === redemption.id);

      if (existingIndex >= 0) {
        // Update existing redemption
        existingRedemptions[existingIndex] = redemption;
      } else {
        // Add new redemption
        existingRedemptions.push(redemption);
      }

      // Save updated redemptions
      LocalStorageManager.saveUserRedemptions(existingRedemptions);
    } catch (error) {
      console.error('Error updating local redemptions:', error);
    }
  }

  private reconnect() {
    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Disconnect and reconnect
    this.disconnect();
    this.connect();
  }

  public disconnect() {
    // Clear intervals and timeouts
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Close socket if open
    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.close();
      }
      this.socket = null;
    }
  }
}

// Create a singleton instance
const twitchPubSubService = new TwitchPubSubService();
export default twitchPubSubService;
