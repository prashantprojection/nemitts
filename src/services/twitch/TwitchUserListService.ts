import twitchAuthService from "./TwitchAuthService";
import { CLIENT_ID } from "./types";
import { toast } from "sonner";

export interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
}

class TwitchUserListService {
  private subscriberCache: Map<string, TwitchUser[]> = new Map();
  private vipCache: Map<string, TwitchUser[]> = new Map();
  private moderatorCache: Map<string, TwitchUser[]> = new Map();
  private blockedTermsCache: Map<string, string[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

  /**
   * Get the broadcaster ID for the current channel
   */
  private async getBroadcasterId(channelName: string): Promise<string | null> {
    try {
      const authState = twitchAuthService.getAuthState();
      if (!authState.accessToken) {
        return null;
      }

      const response = await fetch(`https://api.twitch.tv/helix/users?login=${channelName}`, {
        headers: {
          'Authorization': `Bearer ${authState.accessToken}`,
          'Client-Id': CLIENT_ID
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get broadcaster ID: ${response.status}`);
      }

      const data = await response.json();
      if (data.data && data.data.length > 0) {
        return data.data[0].id;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if the current user is the broadcaster
   */
  public async isBroadcaster(): Promise<boolean> {
    const authState = twitchAuthService.getAuthState();
    if (!authState.username || !authState.channelName) {
      return false;
    }

    return authState.username.toLowerCase() === authState.channelName.toLowerCase();
  }

  /**
   * Get the list of subscribers for the current channel
   */
  public async getSubscribers(): Promise<TwitchUser[]> {
    try {
      const authState = twitchAuthService.getAuthState();
      if (!authState.accessToken || !authState.channelName) {
        return [];
      }

      // Check if we have the required scope
      const hasRequiredScope = authState.scopes?.includes('channel:read:subscriptions');
      if (!hasRequiredScope) {
        console.warn('Missing required scope: channel:read:subscriptions');
        toast.error("Missing required Twitch permissions. Please log out and log in again.");
        return [];
      }

      const channelName = authState.channelName.toLowerCase();
      const cacheKey = `subscribers-${channelName}`;

      // Check cache first
      if (
        this.subscriberCache.has(cacheKey) &&
        this.cacheExpiry.has(cacheKey) &&
        Date.now() < this.cacheExpiry.get(cacheKey)!
      ) {
        return this.subscriberCache.get(cacheKey) || [];
      }

      // Check if we're the broadcaster or a moderator
      try {
        const isBroadcaster = await this.isBroadcaster();
        const isModerator = await this.isCurrentUserModerator();

        if (!isBroadcaster && !isModerator) {
          toast.error("Only the broadcaster or moderators can view the subscriber list.");
          return [];
        }
      } catch (error) {
        console.error('Error checking user permissions:', error);
        return [];
      }

      const broadcasterId = await this.getBroadcasterId(channelName);
      if (!broadcasterId) {
        return [];
      }

      const subscribers: TwitchUser[] = [];
      let cursor: string | null = null;

      do {
        const url = new URL('https://api.twitch.tv/helix/subscriptions');
        url.searchParams.append('broadcaster_id', broadcasterId);
        if (cursor) {
          url.searchParams.append('after', cursor);
        }

        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${authState.accessToken}`,
            'Client-Id': CLIENT_ID
          }
        });

        if (!response.ok) {
          // Don't log out the user, just return an empty list
          if (response.status === 401) {
            toast.error("Unable to fetch subscribers. Please check your Twitch permissions.");
          } else if (response.status === 403) {
            toast.error("You don't have permission to view subscribers for this channel.");
          } else {
            toast.error(`Unable to fetch subscribers. Please try again later.`);
          }
          return [];
        }

        const data = await response.json();

        // Extract subscriber data
        if (data.data) {
          for (const sub of data.data) {
            subscribers.push({
              id: sub.user_id,
              login: sub.user_login,
              display_name: sub.user_name
            });
          }
        }

        // Update cursor for pagination
        cursor = data.pagination && data.pagination.cursor ? data.pagination.cursor : null;
      } while (cursor);

      // Update cache
      this.subscriberCache.set(cacheKey, subscribers);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

      return subscribers;
    } catch (error) {
      console.error('Error fetching subscribers:', error);
      return [];
    }
  }

  /**
   * Get the list of VIPs for the current channel
   */
  public async getVips(): Promise<TwitchUser[]> {
    try {
      const authState = twitchAuthService.getAuthState();
      if (!authState.accessToken || !authState.channelName) {
        return [];
      }

      // Check if we have the required scope
      const hasRequiredScope = authState.scopes?.includes('channel:read:vips');
      if (!hasRequiredScope) {
        console.warn('Missing required scope: channel:read:vips');
        toast.error("Missing required Twitch permissions. Please log out and log in again.");
        return [];
      }

      const channelName = authState.channelName.toLowerCase();
      const cacheKey = `vips-${channelName}`;

      // Check cache first
      if (
        this.vipCache.has(cacheKey) &&
        this.cacheExpiry.has(cacheKey) &&
        Date.now() < this.cacheExpiry.get(cacheKey)!
      ) {
        return this.vipCache.get(cacheKey) || [];
      }

      const broadcasterId = await this.getBroadcasterId(channelName);
      if (!broadcasterId) {
        return [];
      }

      // Check if we're the broadcaster or a moderator
      const isBroadcaster = authState.userId === broadcasterId;
      const isModerator = await this.isCurrentUserModerator();

      if (!isBroadcaster && !isModerator) {
        console.warn('User is not the broadcaster or a moderator, may not have permission to fetch VIPs');
      }

      const vips: TwitchUser[] = [];
      let cursor: string | null = null;

      do {
        const url = new URL('https://api.twitch.tv/helix/channels/vips');
        url.searchParams.append('broadcaster_id', broadcasterId);
        if (cursor) {
          url.searchParams.append('after', cursor);
        }

        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${authState.accessToken}`,
            'Client-Id': CLIENT_ID
          }
        });

        if (!response.ok) {
          // Don't log out the user, just return an empty list
          if (response.status === 401) {
            toast.error("Unable to fetch VIPs. Please check your Twitch permissions.");
          } else if (response.status === 403) {
            toast.error("You don't have permission to view VIPs for this channel.");
          } else {
            toast.error(`Unable to fetch VIPs. Please try again later.`);
          }
          return [];
        }

        const data = await response.json();

        // Extract VIP data
        if (data.data) {
          for (const vip of data.data) {
            vips.push({
              id: vip.user_id,
              login: vip.user_login,
              display_name: vip.user_name
            });
          }
        }

        // Update cursor for pagination
        cursor = data.pagination && data.pagination.cursor ? data.pagination.cursor : null;
      } while (cursor);

      // Update cache
      this.vipCache.set(cacheKey, vips);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

      return vips;
    } catch (error) {
      console.error('Error fetching VIPs:', error);
      return [];
    }
  }

  /**
   * Get the list of moderators for the current channel
   */
  public async getModerators(): Promise<TwitchUser[]> {
    try {
      const authState = twitchAuthService.getAuthState();
      if (!authState.accessToken || !authState.channelName) {
        return [];
      }

      // Check if we have the required scope
      const hasRequiredScope = authState.scopes?.includes('moderation:read');
      if (!hasRequiredScope) {
        console.warn('Missing required scope: moderation:read');
        toast.error("Missing required Twitch permissions. Please log out and log in again.");
        return [];
      }

      const channelName = authState.channelName.toLowerCase();
      const cacheKey = `moderators-${channelName}`;

      // Check cache first
      if (
        this.moderatorCache.has(cacheKey) &&
        this.cacheExpiry.has(cacheKey) &&
        Date.now() < this.cacheExpiry.get(cacheKey)!
      ) {
        return this.moderatorCache.get(cacheKey) || [];
      }

      const broadcasterId = await this.getBroadcasterId(channelName);
      if (!broadcasterId) {
        return [];
      }

      // Check if we're the broadcaster or have broadcaster permissions
      const isBroadcaster = authState.userId === broadcasterId;
      if (!isBroadcaster) {
        console.warn('User is not the broadcaster, may not have permission to fetch moderators');
      }

      const moderators: TwitchUser[] = [];
      let cursor: string | null = null;

      do {
        const url = new URL('https://api.twitch.tv/helix/moderation/moderators');
        url.searchParams.append('broadcaster_id', broadcasterId);
        if (cursor) {
          url.searchParams.append('after', cursor);
        }

        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${authState.accessToken}`,
            'Client-Id': CLIENT_ID
          }
        });

        if (!response.ok) {
          // Don't log out the user, just return an empty list
          if (response.status === 401) {
            toast.error("Unable to fetch moderators. Please check your Twitch permissions.");
          } else if (response.status === 403) {
            toast.error("You don't have permission to view moderators for this channel.");
          } else {
            toast.error(`Unable to fetch moderators. Please try again later.`);
          }
          return [];
        }

        const data = await response.json();

        // Extract moderator data
        if (data.data) {
          for (const mod of data.data) {
            moderators.push({
              id: mod.user_id,
              login: mod.user_login,
              display_name: mod.user_name
            });
          }
        }

        // Update cursor for pagination
        cursor = data.pagination && data.pagination.cursor ? data.pagination.cursor : null;
      } while (cursor);

      // Update cache
      this.moderatorCache.set(cacheKey, moderators);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

      return moderators;
    } catch (error) {
      console.error('Error fetching moderators:', error);
      return [];
    }
  }

  /**
   * Check if a user is a subscriber
   */
  public async isSubscriber(username: string): Promise<boolean> {
    try {
      // Check if we're the broadcaster or a moderator
      const isBroadcaster = await this.isBroadcaster();
      const isModerator = await this.isCurrentUserModerator();

      if (!isBroadcaster && !isModerator) {
        // Only broadcasters and moderators can check subscriber status
        return false;
      }

      const subscribers = await this.getSubscribers();
      return subscribers.some(sub => sub.login.toLowerCase() === username.toLowerCase());
    } catch (error) {
      console.error('Error checking subscriber status:', error);
      return false;
    }
  }

  /**
   * Check if a user is a VIP
   */
  public async isVip(username: string): Promise<boolean> {
    try {
      const vips = await this.getVips();
      return vips.some(vip => vip.login.toLowerCase() === username.toLowerCase());
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if a user is a moderator
   */
  public async isModerator(username: string): Promise<boolean> {
    try {
      // First check if the user is the broadcaster (broadcasters have moderator privileges)
      const authState = twitchAuthService.getAuthState();
      if (authState.username && authState.channelName &&
          authState.username.toLowerCase() === authState.channelName.toLowerCase() &&
          username.toLowerCase() === authState.username.toLowerCase()) {
        return true;
      }

      // Then check the moderator list
      const moderators = await this.getModerators();
      return moderators.some(mod => mod.login.toLowerCase() === username.toLowerCase());
    } catch (error) {
      console.error('Error checking moderator status:', error);
      return false;
    }
  }

  /**
   * Get the list of channels where the current user is a moderator
   */
  public async getModeratedChannels(): Promise<string[]> {
    try {
      const authState = twitchAuthService.getAuthState();
      if (!authState.accessToken || !authState.userId) {
        return [];
      }

      // Check if we have the required scope
      const hasRequiredScope = authState.scopes?.includes('user:read:moderated_channels');
      if (!hasRequiredScope) {
        // Use toast for user feedback instead of console
        toast.warning('Missing required Twitch permission: moderated channels');
        return [];
      }

      const url = new URL('https://api.twitch.tv/helix/moderation/channels');
      url.searchParams.append('user_id', authState.userId);

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${authState.accessToken}`,
          'Client-Id': CLIENT_ID
        }
      });

      if (!response.ok) {
        // Use toast for user feedback instead of console
        if (response.status === 401) {
          toast.error('Twitch authentication expired. Please log in again.');
        } else {
          toast.error(`Failed to get moderated channels: ${response.status}`);
        }
        return [];
      }

      const data = await response.json();
      if (!data.data) {
        return [];
      }

      // Extract channel names
      return data.data.map((channel: any) => channel.broadcaster_login.toLowerCase());
    } catch (error) {
      // Use toast for user feedback instead of console
      toast.error('Error fetching moderated channels');
      return [];
    }
  }

  /**
   * Check if the current logged-in user is a moderator in the current channel
   */
  public async isCurrentUserModerator(): Promise<boolean> {
    try {
      const authState = twitchAuthService.getAuthState();
      if (!authState.username || !authState.channelName) {
        return false;
      }

      // Check if the user is the broadcaster (broadcasters have moderator privileges)
      if (authState.username.toLowerCase() === authState.channelName.toLowerCase()) {
        return true;
      }

      // Get the list of channels where the user is a moderator
      const moderatedChannels = await this.getModeratedChannels();

      // Check if the current channel is in the list
      return moderatedChannels.includes(authState.channelName.toLowerCase());
    } catch (error) {
      // Silent error - don't show toast as this is called frequently
      return false;
    }
  }

  /**
   * Check if the current user is following a channel
   * @param channelName The channel name to check
   * @returns A promise that resolves to true if the user is following the channel, false otherwise
   */
  public async isFollowing(channelName: string): Promise<boolean> {
    try {
      const authState = twitchAuthService.getAuthState();
      if (!authState.accessToken || !authState.userId) {
        return false;
      }

      // Check if we have the required scope
      const hasRequiredScope = authState.scopes?.includes('user:read:follows');
      if (!hasRequiredScope) {
        console.warn('Missing required scope: user:read:follows');
        return false;
      }

      // Get the broadcaster ID
      const broadcasterId = await this.getBroadcasterId(channelName);
      if (!broadcasterId) {
        return false;
      }

      // Check if the user is following the channel
      const url = new URL('https://api.twitch.tv/helix/users/follows');
      url.searchParams.append('from_id', authState.userId);
      url.searchParams.append('to_id', broadcasterId);

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${authState.accessToken}`,
          'Client-Id': CLIENT_ID
        }
      });

      if (!response.ok) {
        console.error(`Failed to check follow status: ${response.status}`);
        return false;
      }

      const data = await response.json();

      // If the user is following the channel, the data will have a total > 0
      return data.total > 0;
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  }

  /**
   * Check if the current user has all required permissions
   */
  public checkRequiredPermissions(): boolean {
    const authState = twitchAuthService.getAuthState();
    if (!authState.accessToken || !authState.scopes) {
      return false;
    }

    // Core required scopes for basic functionality
    const requiredScopes = [
      'channel:read:subscriptions',
      'moderation:read',
      'channel:read:vips'
    ];

    // Check for missing core scopes
    const missingScopes = requiredScopes.filter(scope => !authState.scopes?.includes(scope));

    if (missingScopes.length > 0) {
      console.warn('Missing required core scopes:', missingScopes);
      return false;
    }

    return true;
  }

  /**
   * Check if the current user has permission to access a feature
   * This considers both role (broadcaster/moderator) and required scopes
   * @param feature The feature to check permissions for (e.g., 'subscribers', 'vips', 'moderators')
   * @returns A promise that resolves to true if the user has permission, false otherwise
   */
  public async hasPermissionFor(feature: 'subscribers' | 'vips' | 'moderators' | 'blocked_terms'): Promise<boolean> {
    try {
      // First check if user is logged in
      const authState = twitchAuthService.getAuthState();
      if (!authState.accessToken || !authState.scopes) {
        return false;
      }

      // Check if user is broadcaster or moderator
      const isBroadcaster = await this.isBroadcaster();
      const isModerator = await this.isCurrentUserModerator();

      // Check required scopes based on feature
      let requiredScope = '';
      switch (feature) {
        case 'subscribers':
          requiredScope = 'channel:read:subscriptions';
          break;
        case 'vips':
          requiredScope = 'channel:read:vips';
          break;
        case 'moderators':
          requiredScope = 'moderation:read';
          break;
        case 'blocked_terms':
          requiredScope = 'moderator:read:blocked_terms';
          break;
      }

      const hasScope = authState.scopes.includes(requiredScope);

      // For subscribers, only broadcasters can access the list
      if (feature === 'subscribers') {
        return hasScope && isBroadcaster;
      }

      // For VIPs and moderators, either broadcaster or moderator with the right scope can access
      if (feature === 'vips' || feature === 'moderators') {
        return hasScope && (isBroadcaster || isModerator);
      }

      // For blocked terms, either broadcaster or moderator with the right scope can access
      if (feature === 'blocked_terms') {
        return hasScope && (isBroadcaster || isModerator);
      }

      return false;
    } catch (error) {
      // Silent error - don't show toast as this is called frequently
      return false;
    }
  }

  /**
   * Get a list of all scopes that are missing from the current token
   * This is useful for showing the user what permissions they're missing
   */
  public getMissingScopes(): string[] {
    const authState = twitchAuthService.getAuthState();
    if (!authState.accessToken || !authState.scopes) {
      return [];
    }

    // All the scopes we request in the application
    const allRequestedScopes = [
      // Chat & Message Related
      "chat:read",
      "chat:edit",
      "user:read:chat",
      "user:write:chat",
      "channel:bot",
      "user:bot",

      // Channel & Stream Related
      "channel:read:subscriptions",
      "channel:read:vips",
      "channel:manage:vips",
      "channel:read:redemptions",
      "channel:manage:redemptions",
      "channel:read:charity",

      // Bits & Points Related
      "bits:read",

      // Moderation Related
      "moderation:read",
      "moderator:read:followers",
      "moderator:read:chatters",
      "moderator:read:shield_mode",
      "moderator:read:blocked_terms",
      "moderator:read:automod_settings",
      "moderator:read:banned_users",
      "moderator:read:chat_settings",
      "channel:moderate",

      // User Related
      "user:read:follows",
      "user:read:subscriptions",
      "user:read:blocked_users",
      "user:read:emotes"
    ];

    return allRequestedScopes.filter(scope => !authState.scopes?.includes(scope));
  }

  /**
   * Get the list of blocked terms for the current channel
   */
  public async getBlockedTerms(): Promise<string[]> {
    try {
      const authState = twitchAuthService.getAuthState();
      if (!authState.accessToken || !authState.channelName) {
        return [];
      }

      // Check if we have the required scope
      const hasRequiredScope = authState.scopes?.includes('moderator:read:blocked_terms');
      if (!hasRequiredScope) {
        console.warn('Missing required scope: moderator:read:blocked_terms');
        return [];
      }

      const channelName = authState.channelName.toLowerCase();
      const cacheKey = `blocked-terms-${channelName}`;

      // Check cache first
      if (
        this.blockedTermsCache.has(cacheKey) &&
        this.cacheExpiry.has(cacheKey) &&
        Date.now() < this.cacheExpiry.get(cacheKey)!
      ) {
        return this.blockedTermsCache.get(cacheKey) || [];
      }

      const broadcasterId = await this.getBroadcasterId(channelName);
      if (!broadcasterId) {
        return [];
      }

      const blockedTerms: string[] = [];
      let cursor: string | null = null;

      do {
        const url = new URL('https://api.twitch.tv/helix/moderation/blocked_terms');
        url.searchParams.append('broadcaster_id', broadcasterId);
        if (cursor) {
          url.searchParams.append('after', cursor);
        }

        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${authState.accessToken}`,
            'Client-Id': CLIENT_ID
          }
        });

        if (!response.ok) {
          // Don't log out the user, just return an empty list
          if (response.status === 401) {
            console.warn("Unable to fetch blocked terms. Please check your Twitch permissions.");
          } else if (response.status === 403) {
            console.warn("You don't have permission to view blocked terms for this channel.");
          } else {
            console.warn(`Unable to fetch blocked terms. Please try again later.`);
          }
          return [];
        }

        const data = await response.json();

        // Extract blocked terms data
        if (data.data) {
          for (const term of data.data) {
            if (term.text) {
              blockedTerms.push(term.text);
            }
          }
        }

        // Update cursor for pagination
        cursor = data.pagination && data.pagination.cursor ? data.pagination.cursor : null;
      } while (cursor);

      // Update cache
      this.blockedTermsCache.set(cacheKey, blockedTerms);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

      return blockedTerms;
    } catch (error) {
      console.error('Error fetching blocked terms:', error);
      return [];
    }
  }

  /**
   * Import blocked terms from Twitch to the application's blocklist
   * @param updateFunction Function to update the blocklist in the application
   * @returns The number of terms imported
   */
  public async importBlockedTermsToBlocklist(updateFunction: (term: string) => void): Promise<number> {
    try {
      const blockedTerms = await this.getBlockedTerms();

      if (blockedTerms.length === 0) {
        return 0;
      }

      // Add each term to the blocklist
      let importCount = 0;
      for (const term of blockedTerms) {
        try {
          updateFunction(term);
          importCount++;
        } catch (error) {
          // Silent error - continue with next term
        }
      }

      return importCount;
    } catch (error) {
      toast.error('Error importing blocked terms from Twitch');
      return 0;
    }
  }

  /**
   * Clear all caches
   */
  public clearCache(): void {
    this.subscriberCache.clear();
    this.vipCache.clear();
    this.moderatorCache.clear();
    this.blockedTermsCache.clear();
    this.cacheExpiry.clear();
  }
}

// Create and export a singleton instance
const twitchUserListService = new TwitchUserListService();
export default twitchUserListService;
