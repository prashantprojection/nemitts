import twitchAuthService from './TwitchAuthService';
import { CLIENT_ID } from './types';

/**
 * Interface for Twitch user profiles
 */
export interface UserProfile {
  id: string;
  login: string;
  displayName: string;
  profileImageUrl: string | null;
  timestamp: number;
  imageStatus: 'unknown' | 'valid' | 'invalid';
}

/**
 * Enhanced Twitch Profile Service
 *
 * Features:
 * - Efficient single-user and batch profile fetching
 * - Robust image validation
 * - Intelligent caching with expiration
 * - Graceful fallbacks for error cases
 * - Rate limit awareness
 */
class TwitchProfileService {
  // Cache of user profiles by username (lowercase)
  private profileCache: Map<string, UserProfile> = new Map();

  // Cache of user profiles by ID for quick lookup
  private profileByIdCache: Map<string, string> = new Map();

  // Cache duration in milliseconds (1 hour)
  private readonly CACHE_DURATION = 3600 * 1000;

  // Default Twitch profile image URL
  private readonly DEFAULT_PROFILE_IMAGE = 'https://static-cdn.jtvnw.net/user-default-pictures-uv/ebe4cd89-b4f4-4cd9-adac-2f30151b4209-profile_image-70x70.png';

  // Pending requests to avoid duplicate API calls
  private pendingRequests: Map<string, Promise<UserProfile | null>> = new Map();

  // Batch processing
  private batchQueue: string[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 300; // ms to wait before processing batch
  private readonly MAX_BATCH_SIZE = 100; // Twitch API limit

  // Flag to track initialization
  private isInitialized = false;

  // Image validation cache to avoid checking the same URLs repeatedly
  private imageValidationCache: Map<string, boolean> = new Map();
  private readonly IMAGE_VALIDATION_CACHE_DURATION = 24 * 3600 * 1000; // 24 hours

  /**
   * Initialize the service
   * Loads cached profiles from localStorage and prepares for use
   */
  public initialize(): void {
    if (!this.isInitialized) {
      console.log('[TwitchProfileService] Initializing service');

      // Load cached profiles from localStorage
      this.loadCachedProfiles();

      this.isInitialized = true;
    }
  }

  /**
   * Load cached profiles from localStorage
   */
  private loadCachedProfiles(): void {
    try {
      // Load profile cache
      const cachedProfiles = localStorage.getItem('twitch_profile_cache');
      if (cachedProfiles) {
        const profiles = JSON.parse(cachedProfiles) as UserProfile[];
        console.log(`[TwitchProfileService] Loaded ${profiles.length} profiles from cache`);

        // Rebuild the cache maps
        profiles.forEach(profile => {
          if (profile && profile.login) {
            this.profileCache.set(profile.login.toLowerCase(), profile);

            if (profile.id) {
              this.profileByIdCache.set(profile.id, profile.login.toLowerCase());
            }
          }
        });
      }

      // Load image validation cache
      const cachedImageValidation = localStorage.getItem('twitch_image_validation_cache');
      if (cachedImageValidation) {
        const validationEntries = JSON.parse(cachedImageValidation) as [string, boolean][];
        console.log(`[TwitchProfileService] Loaded ${validationEntries.length} image validations from cache`);

        validationEntries.forEach(([url, isValid]) => {
          this.imageValidationCache.set(url, isValid);
        });
      }
    } catch (error) {
      console.error('[TwitchProfileService] Error loading cached profiles:', error);
      // If there's an error loading the cache, clear it to be safe
      this.clearCaches();
    }
  }

  /**
   * Save cached profiles to localStorage
   */
  private saveCachedProfiles(): void {
    try {
      // Save profile cache
      const profiles = Array.from(this.profileCache.values());
      localStorage.setItem('twitch_profile_cache', JSON.stringify(profiles));

      // Save image validation cache
      const validationEntries = Array.from(this.imageValidationCache.entries());
      localStorage.setItem('twitch_image_validation_cache', JSON.stringify(validationEntries));

      console.log(`[TwitchProfileService] Saved ${profiles.length} profiles and ${validationEntries.length} image validations to cache`);
    } catch (error) {
      console.error('[TwitchProfileService] Error saving cached profiles:', error);
    }
  }

  /**
   * Clear all caches
   */
  public clearCaches(): void {
    console.log('[TwitchProfileService] Clearing all caches');
    this.profileCache.clear();
    this.profileByIdCache.clear();
    this.pendingRequests.clear();
    this.imageValidationCache.clear();

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    this.batchQueue = [];

    // Clear localStorage cache
    try {
      localStorage.removeItem('twitch_profile_cache');
      localStorage.removeItem('twitch_image_validation_cache');
      console.log('[TwitchProfileService] Cleared localStorage cache');
    } catch (error) {
      console.error('[TwitchProfileService] Error clearing localStorage cache:', error);
    }
  }

  /**
   * Get a user profile by username
   *
   * @param username The Twitch username
   * @param forceRefresh Whether to force a refresh from the API
   * @returns Promise<UserProfile | null> The user profile or null if not found
   */
  public async getUserProfile(username: string, forceRefresh = false): Promise<UserProfile | null> {
    if (!username) return null;

    // Normalize username
    const normalizedUsername = username.toLowerCase().trim();

    // Check cache first (unless force refresh is requested)
    if (!forceRefresh) {
      const cachedProfile = this.profileCache.get(normalizedUsername);
      if (cachedProfile && (Date.now() - cachedProfile.timestamp) < this.CACHE_DURATION) {
        console.log(`[TwitchProfileService] Using cached profile for ${normalizedUsername}`);

        // If the image status is unknown, validate it in the background
        if (cachedProfile.profileImageUrl && cachedProfile.imageStatus === 'unknown') {
          this.validateImageUrlInBackground(cachedProfile.profileImageUrl, normalizedUsername);
        }

        return cachedProfile;
      }
    }

    // Check if there's already a pending request for this username
    if (this.pendingRequests.has(normalizedUsername)) {
      console.log(`[TwitchProfileService] Using pending request for ${normalizedUsername}`);
      return this.pendingRequests.get(normalizedUsername) || null;
    }

    // Create a new request
    const requestPromise = this.fetchUserProfile(normalizedUsername);
    this.pendingRequests.set(normalizedUsername, requestPromise);

    try {
      const profile = await requestPromise;
      return profile;
    } finally {
      // Clean up the pending request
      this.pendingRequests.delete(normalizedUsername);
    }
  }

  /**
   * Get a user profile by ID
   *
   * @param userId The Twitch user ID
   * @param forceRefresh Whether to force a refresh from the API
   * @returns Promise<UserProfile | null> The user profile or null if not found
   */
  public async getUserProfileById(userId: string, forceRefresh = false): Promise<UserProfile | null> {
    if (!userId) return null;

    // Check if we have this user ID in our cache
    if (!forceRefresh && this.profileByIdCache.has(userId)) {
      const username = this.profileByIdCache.get(userId);
      if (username) {
        const profile = this.profileCache.get(username);
        if (profile && (Date.now() - profile.timestamp) < this.CACHE_DURATION) {
          console.log(`[TwitchProfileService] Using cached profile for ID ${userId}`);
          return profile;
        }
      }
    }

    // Fetch the profile directly by ID
    try {
      const authState = twitchAuthService.getAuthState();
      if (!authState.accessToken) {
        console.warn('[TwitchProfileService] No access token available for profile fetch by ID');
        return null;
      }

      const url = new URL('https://api.twitch.tv/helix/users');
      url.searchParams.append('id', userId);

      console.log(`[TwitchProfileService] Fetching profile by ID from Twitch API: ${url.toString()}`);

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${authState.accessToken}`,
          'Client-Id': CLIENT_ID
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user profile by ID: ${response.status}`);
      }

      const data = await response.json();

      if (data.data && data.data.length > 0) {
        const userData = data.data[0];

        const profile: UserProfile = {
          id: userData.id,
          login: userData.login.toLowerCase(),
          displayName: userData.display_name,
          profileImageUrl: userData.profile_image_url || this.DEFAULT_PROFILE_IMAGE,
          timestamp: Date.now(),
          imageStatus: 'unknown'
        };

        // Cache the profile
        this.profileCache.set(profile.login, profile);
        this.profileByIdCache.set(profile.id, profile.login);

        // Save the updated cache to localStorage
        this.saveCachedProfiles();

        // Validate the image URL in the background
        if (profile.profileImageUrl) {
          this.validateImageUrlInBackground(profile.profileImageUrl, profile.login);
        }

        return profile;
      }

      return null;
    } catch (error) {
      console.error(`[TwitchProfileService] Error fetching profile for ID ${userId}:`, error);
      return null;
    }
  }

  /**
   * Fetch a single user profile from the Twitch API
   *
   * @param username The normalized username
   * @returns Promise<UserProfile | null> The user profile or null if not found
   */
  private async fetchUserProfile(username: string): Promise<UserProfile | null> {
    // Add to batch queue
    this.batchQueue.push(username);

    // Set up the batch processing if not already set
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.processBatchQueue(), this.BATCH_DELAY);
    }

    // Create a promise that will be resolved when the batch is processed
    return new Promise<UserProfile | null>((resolve) => {
      // Set up a timeout to prevent hanging promises
      const timeout = setTimeout(() => {
        console.warn(`[TwitchProfileService] Request timed out for ${username}, using default profile`);

        // Create a default profile
        const defaultProfile: UserProfile = {
          id: '',
          login: username,
          displayName: username,
          profileImageUrl: null,
          timestamp: Date.now(),
          imageStatus: 'unknown'
        };

        // Cache the default profile
        this.profileCache.set(username, defaultProfile);

        // Save the updated cache to localStorage
        this.saveCachedProfiles();

        resolve(defaultProfile);
      }, 10000); // 10 second timeout

      // Store the resolve function to be called when the batch is processed
      (this as any)[`resolve_${username}`] = (profile: UserProfile | null) => {
        clearTimeout(timeout);
        resolve(profile);
      };
    });
  }

  /**
   * Process the batch queue of usernames
   */
  private async processBatchQueue(): Promise<void> {
    this.batchTimer = null;

    if (this.batchQueue.length === 0) return;

    // Take up to MAX_BATCH_SIZE usernames from the queue
    const batch = this.batchQueue.splice(0, this.MAX_BATCH_SIZE);
    console.log(`[TwitchProfileService] Processing batch of ${batch.length} usernames`);

    try {
      const authState = twitchAuthService.getAuthState();
      if (!authState.accessToken) {
        console.warn('[TwitchProfileService] No access token available for batch profile fetch');

        // Resolve all promises with default profiles
        batch.forEach(username => {
          const defaultProfile: UserProfile = {
            id: '',
            login: username,
            displayName: username,
            profileImageUrl: null,
            timestamp: Date.now(),
            imageStatus: 'unknown'
          };

          this.profileCache.set(username, defaultProfile);

          const resolveFunction = (this as any)[`resolve_${username}`];
          if (typeof resolveFunction === 'function') {
            resolveFunction(defaultProfile);
            delete (this as any)[`resolve_${username}`];
          }
        });

        return;
      }

      // Build the URL with all usernames
      const url = new URL('https://api.twitch.tv/helix/users');
      batch.forEach(username => {
        url.searchParams.append('login', username);
      });

      console.log(`[TwitchProfileService] Fetching profiles from Twitch API: ${url.toString()}`);
      console.log(`[TwitchProfileService] Using auth token: ${authState.accessToken ? 'Present (hidden)' : 'Missing'}`);
      console.log(`[TwitchProfileService] Using client ID: ${CLIENT_ID}`);

      // Call Twitch API to get user profiles
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${authState.accessToken}`,
          'Client-Id': CLIENT_ID
        }
      });

      console.log(`[TwitchProfileService] API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TwitchProfileService] API error response: ${errorText}`);
        throw new Error(`Failed to fetch user profiles: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`[TwitchProfileService] API response data:`, data);

      // Create a map of username to user data
      const userMap = new Map<string, any>();
      if (data.data && data.data.length > 0) {
        data.data.forEach((user: any) => {
          userMap.set(user.login.toLowerCase(), user);
        });
      }

      // Process each username in the batch
      batch.forEach(username => {
        const userData = userMap.get(username.toLowerCase());

        if (userData) {
          // User found in API response
          const profile: UserProfile = {
            id: userData.id,
            login: userData.login.toLowerCase(),
            displayName: userData.display_name,
            profileImageUrl: userData.profile_image_url || this.DEFAULT_PROFILE_IMAGE,
            timestamp: Date.now(),
            imageStatus: 'unknown'
          };

          // Cache the profile
          this.profileCache.set(username.toLowerCase(), profile);
          this.profileByIdCache.set(profile.id, profile.login);

          // Save the updated cache to localStorage
          this.saveCachedProfiles();

          // Validate the image URL in the background
          if (profile.profileImageUrl) {
            this.validateImageUrlInBackground(profile.profileImageUrl, username);
          }

          // Resolve the promise
          const resolveFunction = (this as any)[`resolve_${username}`];
          if (typeof resolveFunction === 'function') {
            resolveFunction(profile);
            delete (this as any)[`resolve_${username}`];
          }
        } else {
          // User not found in API response
          const defaultProfile: UserProfile = {
            id: '',
            login: username.toLowerCase(),
            displayName: username,
            profileImageUrl: null,
            timestamp: Date.now(),
            imageStatus: 'unknown'
          };

          // Cache the default profile
          this.profileCache.set(username.toLowerCase(), defaultProfile);

          // Save the updated cache to localStorage
          this.saveCachedProfiles();

          // Resolve the promise
          const resolveFunction = (this as any)[`resolve_${username}`];
          if (typeof resolveFunction === 'function') {
            resolveFunction(defaultProfile);
            delete (this as any)[`resolve_${username}`];
          }
        }
      });
    } catch (error) {
      console.error('[TwitchProfileService] Error processing batch:', error);

      // Resolve all promises with default profiles
      batch.forEach(username => {
        const defaultProfile: UserProfile = {
          id: '',
          login: username.toLowerCase(),
          displayName: username,
          profileImageUrl: null,
          timestamp: Date.now(),
          imageStatus: 'unknown'
        };

        this.profileCache.set(username.toLowerCase(), defaultProfile);

        // Save the updated cache to localStorage
        this.saveCachedProfiles();

        const resolveFunction = (this as any)[`resolve_${username}`];
        if (typeof resolveFunction === 'function') {
          resolveFunction(defaultProfile);
          delete (this as any)[`resolve_${username}`];
        }
      });
    }

    // Process any remaining usernames in the queue
    if (this.batchQueue.length > 0) {
      this.batchTimer = setTimeout(() => this.processBatchQueue(), this.BATCH_DELAY);
    }
  }

  /**
   * Validate an image URL in the background
   *
   * @param url The image URL to validate
   * @param username The username associated with the image
   */
  private validateImageUrlInBackground(url: string, username: string): void {
    // Check if we've already validated this URL recently
    const cachedResult = this.imageValidationCache.get(url);
    if (cachedResult !== undefined) {
      // Update the profile with the cached result
      const profile = this.profileCache.get(username);
      if (profile) {
        profile.imageStatus = cachedResult ? 'valid' : 'invalid';
        if (!cachedResult) {
          profile.profileImageUrl = this.DEFAULT_PROFILE_IMAGE;
        }
      }
      return;
    }

    // Validate the image URL
    this.validateImageUrl(url)
      .then(isValid => {
        // Cache the validation result
        this.imageValidationCache.set(url, isValid);

        // Update the profile
        const profile = this.profileCache.get(username);
        if (profile) {
          profile.imageStatus = isValid ? 'valid' : 'invalid';
          if (!isValid && profile.profileImageUrl === url) {
            profile.profileImageUrl = this.DEFAULT_PROFILE_IMAGE;
          }

          // Save the updated cache to localStorage
          this.saveCachedProfiles();
        }

        // Clean up old validation results periodically
        setTimeout(() => {
          this.imageValidationCache.delete(url);
        }, this.IMAGE_VALIDATION_CACHE_DURATION);
      })
      .catch(() => {
        // Assume invalid on error
        this.imageValidationCache.set(url, false);

        // Update the profile
        const profile = this.profileCache.get(username);
        if (profile) {
          profile.imageStatus = 'invalid';
          if (profile.profileImageUrl === url) {
            profile.profileImageUrl = this.DEFAULT_PROFILE_IMAGE;
          }

          // Save the updated cache to localStorage
          this.saveCachedProfiles();
        }
      });
  }

  /**
   * Validate that an image URL is accessible
   *
   * @param url The URL to validate
   * @returns Promise<boolean> True if the image is valid, false otherwise
   */
  private validateImageUrl(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!url) {
        resolve(false);
        return;
      }

      const img = new Image();

      img.onload = () => {
        resolve(true);
      };

      img.onerror = () => {
        resolve(false);
      };

      // Set a timeout to prevent hanging
      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000);

      // Clean up on load/error
      const cleanup = () => {
        clearTimeout(timeout);
      };

      img.onload = () => {
        cleanup();
        resolve(true);
      };

      img.onerror = () => {
        cleanup();
        resolve(false);
      };

      img.src = url;
    });
  }

  /**
   * Get the default profile image URL
   *
   * @returns string The default profile image URL
   */
  public getDefaultProfileImage(): string {
    return this.DEFAULT_PROFILE_IMAGE;
  }
}

// Create a singleton instance
const twitchProfileService = new TwitchProfileService();
export default twitchProfileService;
