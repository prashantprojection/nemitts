import { MessageFilterSettings } from './types';
import twitchUserListService from '../twitch/TwitchUserListService';
import { supabase } from "@/integrations/supabase/client";
import LocalStorageManager from "../LocalStorageManager";

/**
 * Utility class for filtering messages based on various criteria
 */
export class MessageFilter {
  private settings: MessageFilterSettings;
  private lastMessageTimeByUser: Map<string, number> = new Map();

  constructor(settings: MessageFilterSettings) {
    this.settings = settings;
  }

  /**
   * Update filter settings
   */
  public updateSettings(settings: MessageFilterSettings): void {
    // Make sure we're not losing any settings by merging with existing settings
    this.settings = { ...this.settings, ...settings };

    // Ensure arrays are properly initialized
    if (!this.settings.keywordBlacklist) this.settings.keywordBlacklist = [];
    if (!this.settings.userBlacklist) this.settings.userBlacklist = [];
    if (!this.settings.specificUsersList) this.settings.specificUsersList = [];
    // regexFilters removed
    if (!this.settings.priorityUsers) this.settings.priorityUsers = [];
    if (!this.settings.wordReplacements) this.settings.wordReplacements = [];
    if (!this.settings.userNicknames) this.settings.userNicknames = [];
  }

  /**
   * Check if a message should be read based on filter settings
   */
  public async shouldReadMessage(message: string, username?: string): Promise<boolean> {
    // Skip empty messages
    if (!message || message.trim() === '') {
      return false;
    }

    // If filter is disabled, always read the message
    if (!this.settings.enabled) {
      return true;
    }

    // Check if specific users only mode is enabled
    if (this.settings.specificUsersOnly) {
      // If we have a username and a non-empty specific users list
      if (username && this.settings.specificUsersList && this.settings.specificUsersList.length > 0) {
        // Check if user is directly in the specific users list
        const isInSpecificList = this.settings.specificUsersList.some(
          u => u.toLowerCase() === username.toLowerCase()
        );

        // Check if user matches special user types
        // Use try-catch to prevent errors from crashing the application
        let isSubscriberAndAllowed = false;
        let isVipAndAllowed = false;
        let isModeratorAndAllowed = false;

        try {
          if (this.settings.specificUsersList.includes('@subscribers')) {
            isSubscriberAndAllowed = await this.isSubscriber(username);
          }
        } catch (error) {
          // Silently handle errors
        }

        try {
          if (this.settings.specificUsersList.includes('@vips')) {
            isVipAndAllowed = await this.isVIP(username);
          }
        } catch (error) {
          // Silently handle errors
        }

        try {
          if (this.settings.specificUsersList.includes('@moderators')) {
            isModeratorAndAllowed = await this.isModerator(username);
          }
        } catch (error) {
          // Silently handle errors
        }

        // Check if user has an active redemption
        const hasActiveRedemption = await this.checkUserRedemption(username);

        // If user doesn't match any criteria, filter out the message
        if (!isInSpecificList && !isModeratorAndAllowed && !isVipAndAllowed && !isSubscriberAndAllowed && !hasActiveRedemption) {
          return false;
        }
      } else if (!username) {
        // If specific users mode is on but we don't have a username, filter it out
        return false;
      } else if (!this.settings.specificUsersList || this.settings.specificUsersList.length === 0) {
        // If specific users mode is on but the list is empty, filter out all messages
        return false;
      }
    }

    // Check if user is in userBlacklist
    if (username && this.settings.userBlacklist?.some(u => u.toLowerCase() === username.toLowerCase())) {
      return false;
    }

    // Also check if user is in blocklist (keywordBlacklist with @ prefix for backward compatibility)
    if (username && this.settings.keywordBlacklist?.some(word =>
      (word.startsWith('@') && word.substring(1).toLowerCase() === username.toLowerCase())
    )) {
      return false;
    }

    // Check message length
    if (this.settings.minMessageLength && message.length < this.settings.minMessageLength) {
      return false;
    }

    if (this.settings.maxMessageLength && message.length > this.settings.maxMessageLength) {
      return false;
    }

    // Check user cooldown
    if (username && this.settings.userCooldown && this.settings.userCooldown > 0) {
      const lastMessageTime = this.lastMessageTimeByUser.get(username.toLowerCase());
      const now = Date.now();

      if (lastMessageTime && (now - lastMessageTime) / 1000 < this.settings.userCooldown) {
        return false;
      }

      // Update last message time
      this.lastMessageTimeByUser.set(username.toLowerCase(), now);
    }

    // Skip messages with only emojis (but not all messages with emojis)
    if (this.containsOnlyEmojis(message)) {
      return false;
    }

    // Skip bot messages if enabled
    if (this.settings.skipBotMessages && username && this.isBotUsername(username)) {
      return false;
    }

    // Check blacklisted keywords
    if (this.settings.keywordBlacklist && this.settings.keywordBlacklist.length > 0) {
      const messageLower = message.toLowerCase();
      for (const keyword of this.settings.keywordBlacklist) {
        if (keyword && keyword.trim() && messageLower.includes(keyword.toLowerCase().trim())) {
          console.log(`Message blocked due to keyword: ${keyword}`);
          return false;
        }
      }
    }

    // Regex filters removed

    // If we got here, the message passed all filters
    return true;
  }

  /**
   * Calculate priority for a message based on filter settings
   */
  public calculateMessagePriority(message: string, username?: string): number {
    let priority = 0;

    // Priority users get higher priority
    if (username && this.settings.priorityUsers.includes(username.toLowerCase())) {
      priority += 10;
    }

    // Regex whitelist filters removed

    return priority;
  }

  /**
   * Check if a message contains only emojis
   */
  private containsOnlyEmojis(message: string): boolean {
    // Remove all emoji characters and check if anything remains
    const nonEmojiText = message.replace(/[\p{Emoji}]/gu, '').trim();
    return message.length > 0 && nonEmojiText.length === 0;
  }

  /**
   * Check if a message contains links
   */
  private containsLinks(message: string): boolean {
    // Simple URL detection regex
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/i;
    return urlRegex.test(message);
  }

  /**
   * Check if a username appears to be a bot
   */
  private isBotUsername(username: string): boolean {
    // Common Twitch bot usernames
    const knownBots = [
      'nightbot',
      'streamelements',
      'streamlabs',
      'moobot',
      'commanderroot',
      'sery_bot',
      'fossabot',
      'deepbot',
      'wizebot',
      'streamcaptainbot',
      'pretzelrocks',
      'botisimo',
      'phantombot',
      'streamjam',
      'stay_hydrated_bot',
      'soundalerts',
      'ankhbot',
      'streamkit',
      'vivbot',
      'coebot',
      'xanbot',
      'scottybot',
      'ohbot',
      'hnlbot',
      'revlobot',
      'muxybot',
      'mirthbot',
      'fredboat',
      'electricalskateboard',
      'blerp',
      'slanderbot',
      'streamholics',
      'restreambot',
      'songlistbot',
      'creatisbot',
      'mitsuku',
      'streamavatarbot',
      'twitchprimereminder',
      'own3d',
      'streamdeck',
      'streamdeckbot'
    ];

    // Check if username is in the known bots list
    if (knownBots.includes(username.toLowerCase())) {
      return true;
    }

    // Check for common bot patterns in usernames
    const botPatterns = [
      /bot$/i,      // ends with 'bot'
      /^bot/i,      // starts with 'bot'
      /_bot$/i,     // ends with '_bot'
      /_bot_/i,     // contains '_bot_'
      /\bbot\b/i    // contains the word 'bot'
    ];

    return botPatterns.some(pattern => pattern.test(username));
  }

  /**
   * Check if a user is a subscriber
   */
  private async isSubscriber(username: string): Promise<boolean> {
    return await twitchUserListService.isSubscriber(username);
  }

  /**
   * Check if a user is a VIP
   */
  private async isVIP(username: string): Promise<boolean> {
    return await twitchUserListService.isVip(username);
  }

  /**
   * Check if a user is a moderator
   */
  private async isModerator(username: string): Promise<boolean> {
    return await twitchUserListService.isModerator(username);
  }

  /**
   * Check if a user has an active redemption
   */
  private async checkUserRedemption(username: string): Promise<boolean> {
    try {
      // First check localStorage for faster access
      const localRedemptions = LocalStorageManager.loadUserRedemptions();
      if (localRedemptions && localRedemptions.length > 0) {
        const userRedemption = localRedemptions.find(
          r => r.twitch_username.toLowerCase() === username.toLowerCase()
        );

        if (userRedemption) {
          // Check if the redemption is still valid
          if (userRedemption.redemption_type === 'time' && userRedemption.expires_at) {
            // Check if the expiration date is in the future
            const expiresAt = new Date(userRedemption.expires_at);
            if (expiresAt > new Date()) {
              return true;
            }
          } else if (userRedemption.redemption_type === 'messages' && userRedemption.messages_remaining) {
            // Check if there are messages remaining
            if (userRedemption.messages_remaining > 0) {
              // Decrement the message count
              userRedemption.messages_remaining -= 1;
              userRedemption.updated_at = new Date().toISOString();

              // Update localStorage
              LocalStorageManager.saveUserRedemptions(localRedemptions);

              // Also update Supabase in the background
              this.updateRedemptionInSupabase(userRedemption).catch(error => {
                console.error('Error updating redemption in Supabase:', error);
              });

              return true;
            }
          }
        }
      }

      // If not found in localStorage or invalid, check Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Query for active redemptions for this user
      const { data, error } = await supabase
        .from('user_redemptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('twitch_username', username.toLowerCase())
        .single();

      if (error || !data) {
        return false;
      }

      // Check if the redemption is still valid
      if (data.redemption_type === 'time' && data.expires_at) {
        // Check if the expiration date is in the future
        const expiresAt = new Date(data.expires_at);
        if (expiresAt > new Date()) {
          // Update localStorage with this redemption
          const localRedemptions = LocalStorageManager.loadUserRedemptions() || [];
          const existingIndex = localRedemptions.findIndex(r => r.id === data.id);

          if (existingIndex >= 0) {
            localRedemptions[existingIndex] = {
              ...data
            };
          } else {
            localRedemptions.push({
              ...data
            });
          }

          LocalStorageManager.saveUserRedemptions(localRedemptions);
          return true;
        }
      } else if (data.redemption_type === 'messages' && data.messages_remaining) {
        // Check if there are messages remaining
        if (data.messages_remaining > 0) {
          // Decrement the message count
          const { error: updateError } = await supabase
            .from('user_redemptions')
            .update({
              messages_remaining: data.messages_remaining - 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', data.id);

          if (updateError) {
            console.error('Error updating message count:', updateError);
          } else {
            // Update localStorage with this redemption
            const localRedemptions = LocalStorageManager.loadUserRedemptions() || [];
            const existingIndex = localRedemptions.findIndex(r => r.id === data.id);

            if (existingIndex >= 0) {
              localRedemptions[existingIndex] = {
                ...data,
                messages_remaining: data.messages_remaining - 1,
                updated_at: new Date().toISOString()
              };
            } else {
              localRedemptions.push({
                ...data,
                messages_remaining: data.messages_remaining - 1,
                updated_at: new Date().toISOString()
              });
            }

            LocalStorageManager.saveUserRedemptions(localRedemptions);
          }
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking user redemption:', error);
      return false;
    }
  }

  /**
   * Update a redemption in Supabase
   */
  private async updateRedemptionInSupabase(redemption: any): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_redemptions')
        .update({
          messages_remaining: redemption.messages_remaining,
          updated_at: redemption.updated_at
        })
        .eq('id', redemption.id);

      if (error) {
        console.error('Error updating redemption in Supabase:', error);
      }
    } catch (error) {
      console.error('Error updating redemption in Supabase:', error);
    }
  }
}

// Create and export a singleton instance
const messageFilter = new MessageFilter(
  {
    enabled: true,
    keywordBlacklist: [],
    userBlacklist: [],
    speakUsernames: true,
    useNicknames: false,
    userNicknames: [],
    skipEmojisInMessage: true,
    skipLinksInMessage: true,
    skipBotMessages: true,
    // regexFilters removed
    wordReplacements: [],
    minMessageLength: 0,
    maxMessageLength: 500,
    userCooldown: 0,
    priorityUsers: []
  }
);

export default messageFilter;
