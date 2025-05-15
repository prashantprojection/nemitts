import twitchAuthService from './TwitchAuthService';
import { CLIENT_ID } from './types';

/**
 * Interface for Twitch channel search results
 */
export interface ChannelSearchResult {
  id: string;
  broadcaster_login: string;
  display_name: string;
  game_id: string;
  game_name: string;
  title: string;
  thumbnail_url: string;
  is_live: boolean;
  started_at: string | null;
  tags: string[];
}

/**
 * Service for searching Twitch channels
 */
class TwitchChannelSearchService {
  /**
   * Search for channels by name
   * 
   * @param query The search query
   * @param limit The maximum number of results to return (default: 10, max: 100)
   * @returns Promise<ChannelSearchResult[]> The search results
   */
  public async searchChannels(query: string, limit: number = 10): Promise<ChannelSearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    try {
      const authState = twitchAuthService.getAuthState();
      if (!authState.accessToken) {
        console.warn('[TwitchChannelSearchService] No access token available for channel search');
        return [];
      }

      // Build the URL for the search
      const url = new URL('https://api.twitch.tv/helix/search/channels');
      url.searchParams.append('query', query.trim());
      url.searchParams.append('first', Math.min(100, Math.max(1, limit)).toString());

      console.log(`[TwitchChannelSearchService] Searching channels with query: ${query}`);

      // Call Twitch API to search for channels
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${authState.accessToken}`,
          'Client-Id': CLIENT_ID
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TwitchChannelSearchService] API error response: ${response.status} - ${errorText}`);
        throw new Error(`Failed to search channels: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`[TwitchChannelSearchService] Found ${data.data?.length || 0} channels`);

      return data.data || [];
    } catch (error) {
      console.error('[TwitchChannelSearchService] Error searching channels:', error);
      return [];
    }
  }

  /**
   * Check if a channel exists by username
   * 
   * @param username The channel username to check
   * @returns Promise<boolean> True if the channel exists, false otherwise
   */
  public async channelExists(username: string): Promise<boolean> {
    if (!username.trim()) {
      return false;
    }

    try {
      const results = await this.searchChannels(username.trim(), 5);
      
      // Check if any of the results match the username exactly
      const exactMatch = results.find(
        channel => channel.broadcaster_login.toLowerCase() === username.trim().toLowerCase()
      );
      
      return !!exactMatch;
    } catch (error) {
      console.error(`[TwitchChannelSearchService] Error checking if channel exists: ${username}`, error);
      return false;
    }
  }

  /**
   * Get a channel by username
   * 
   * @param username The channel username to get
   * @returns Promise<ChannelSearchResult | null> The channel or null if not found
   */
  public async getChannelByUsername(username: string): Promise<ChannelSearchResult | null> {
    if (!username.trim()) {
      return null;
    }

    try {
      const results = await this.searchChannels(username.trim(), 5);
      
      // Find an exact match by username
      const exactMatch = results.find(
        channel => channel.broadcaster_login.toLowerCase() === username.trim().toLowerCase()
      );
      
      return exactMatch || null;
    } catch (error) {
      console.error(`[TwitchChannelSearchService] Error getting channel by username: ${username}`, error);
      return null;
    }
  }
}

// Create a singleton instance
const twitchChannelSearchService = new TwitchChannelSearchService();
export default twitchChannelSearchService;
