import twitchAuthService from './TwitchAuthService';
import { CLIENT_ID } from './types';

/**
 * Service for checking Twitch stream status
 */
class TwitchStreamService {
  private streamStatusCache: Map<string, { isLive: boolean, timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 60 * 1000; // 60 seconds

  /**
   * Check if a channel is currently live
   * @param channelName The channel name to check
   * @returns Promise<boolean> True if the channel is live, false otherwise
   */
  public async isChannelLive(channelName: string): Promise<boolean> {
    if (!channelName) return false;
    
    // Normalize channel name
    const normalizedChannelName = channelName.toLowerCase().trim();
    
    // Check cache first
    const cachedStatus = this.streamStatusCache.get(normalizedChannelName);
    if (cachedStatus && (Date.now() - cachedStatus.timestamp) < this.CACHE_DURATION) {
      return cachedStatus.isLive;
    }
    
    try {
      const authState = twitchAuthService.getAuthState();
      if (!authState.accessToken) {
        console.warn('No access token available to check stream status');
        return false;
      }
      
      // Call Twitch API to check if the channel is live
      const response = await fetch(`https://api.twitch.tv/helix/streams?user_login=${normalizedChannelName}`, {
        headers: {
          'Authorization': `Bearer ${authState.accessToken}`,
          'Client-Id': CLIENT_ID
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to check stream status: ${response.status}`);
      }
      
      const data = await response.json();
      const isLive = data.data && data.data.length > 0;
      
      // Cache the result
      this.streamStatusCache.set(normalizedChannelName, {
        isLive,
        timestamp: Date.now()
      });
      
      return isLive;
    } catch (error) {
      console.error('Error checking stream status:', error);
      return false;
    }
  }
  
  /**
   * Clear the stream status cache
   */
  public clearCache(): void {
    this.streamStatusCache.clear();
  }
}

const twitchStreamService = new TwitchStreamService();
export default twitchStreamService;
