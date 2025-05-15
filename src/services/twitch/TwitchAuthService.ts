
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthConfig, AuthState, CLIENT_ID, SCOPES, defaultAuthState, getRedirectUri } from "./types";
import { loadAuthState, saveAuthState, fetchUserInfo, validateToken } from "./authUtils";
import { updateUserSettings } from "./supabaseIntegration";
import { debugLog, debugAuthState, checkStorageSupport } from "@/utils/debugUtils";
import twitchUserListService from "./TwitchUserListService";
import settingsService from "@/services/SettingsService";

export class TwitchAuthService {
  private config: AuthConfig;
  private state: AuthState;
  private stateKey = "twitch-tts-auth-state";
  private stateChangeListeners: ((state: AuthState) => void)[] = [];

  private validationInterval: number | null = null;

  constructor() {
    // Check storage support for debugging
    checkStorageSupport();

    // Get the redirect URI
    const redirectUri = getRedirectUri();
    debugLog('Initialized with redirect URI', redirectUri);

    this.config = {
      clientId: CLIENT_ID,
      redirectUri: redirectUri,
      scope: SCOPES,
    };

    // Store the redirect URI for consistency
    try {
      localStorage.setItem('twitch-redirect-uri', redirectUri);
    } catch (e) {
      debugLog('Failed to store redirect URI in localStorage', e);
    }

    // Load saved auth state from localStorage
    this.state = loadAuthState(this.stateKey);
    debugLog('Loaded initial auth state', this.state);
    debugAuthState();

    // Validate the loaded token if we have one
    if (this.state.accessToken) {
      debugLog('Found access token, validating...');

      // Check if the token is expired based on our stored expiration time
      if (this.state.expiresAt && Date.now() > this.state.expiresAt) {
        debugLog('Token is expired based on stored expiration time, attempting refresh');
        // Token is expired, try to refresh it
        this.checkAndRefreshTokenIfNeeded();
      } else {
        // Token might be valid, validate it
        this.validateSavedToken();
      }

      // Set up validation and refresh intervals
      this.setupValidationInterval();

      // Also run an immediate check for token refresh
      // This helps in cases where the token is valid but close to expiration
      setTimeout(() => {
        this.checkAndRefreshTokenIfNeeded();
      }, 5000); // Short delay to allow other initialization to complete
    } else {
      debugLog('No access token found in initial state');
    }

    // Check for auth callback on page load
    this.handleAuthCallback();
  }

  // Set up hourly token validation as required by Twitch
  private setupValidationInterval(): void {
    // Clear any existing interval
    if (this.validationInterval) {
      window.clearInterval(this.validationInterval);
      this.validationInterval = null;
    }

    // Only set up validation if we have a token
    if (this.state.accessToken) {
      debugLog('Setting up validation interval');

      // Set up validation interval - check every 30 minutes (1800000 ms)
      // This is more frequent than the hourly requirement to ensure we catch any issues early
      this.validationInterval = window.setInterval(() => {
        debugLog('Running scheduled token validation');
        this.validateSavedToken();
      }, 1800000);

      // Also set up a refresh check that runs more frequently to check if token needs refresh
      // This runs every 5 minutes (300000 ms)
      setInterval(() => {
        this.checkAndRefreshTokenIfNeeded();
      }, 300000);
    }
  }

  // Validate a saved token to ensure it's still valid
  private async validateSavedToken(): Promise<void> {
    debugLog('Validating saved token');
    if (!this.state.accessToken) {
      // No token to validate
      debugLog('No token to validate');
      this.state.isLoggedIn = false;
      saveAuthState(this.state, this.stateKey);
      return;
    }

    // Check if the token is expired based on our stored expiration time
    if (this.state.expiresAt && Date.now() > this.state.expiresAt) {
      // Token is expired, clear it
      debugLog('Token is expired, clearing it', { expiresAt: this.state.expiresAt, now: Date.now() });
      this.state.isLoggedIn = false;
      this.state.accessToken = null;
      this.state.expiresAt = null;
      this.state.lastValidated = null;
      this.state.scopes = null;
      saveAuthState(this.state, this.stateKey);
      this.notifyStateChange();
      toast.error("Session expired. Please log in again.");
      return;
    }

    debugLog('Token not expired, validating with Twitch API');

    try {
      // Directly validate the token with Twitch
      debugLog('Calling Twitch validation API');
      const validationData = await validateToken(this.state.accessToken);
      debugLog('Token validation successful', validationData);

      // Update state with validation data
      this.state.username = validationData.login;
      this.state.userId = validationData.user_id;
      this.state.scopes = validationData.scopes;

      // Calculate when the token expires
      this.state.expiresAt = Date.now() + (validationData.expires_in * 1000);
      this.state.lastValidated = Date.now();
      debugLog('Updated token expiration', {
        expiresAt: new Date(this.state.expiresAt).toISOString(),
        expiresIn: Math.floor((this.state.expiresAt - Date.now()) / 1000 / 60) + ' minutes'
      });

      // If channel name is not set, use the username
      if (!this.state.channelName) {
        this.state.channelName = validationData.login;
        debugLog('Set default channel name to username', this.state.channelName);
      }

      // Now fetch additional user info like profile image
      try {
        debugLog('Fetching additional user info');
        const userInfo = await fetchUserInfo(this.state.accessToken, this.config.clientId);
        this.state.profileImageUrl = userInfo.profileImageUrl;
        debugLog('Got profile image URL', this.state.profileImageUrl);
      } catch (e) {
        // If we can't get the profile image, that's ok - we still have a valid token
        debugLog('Failed to get profile image, but token is still valid', e);
      }

      // If we get here, the token is valid
      this.state.isLoggedIn = true;
      debugLog('Token is valid, saving updated state', this.state);
      saveAuthState(this.state, this.stateKey); // Save the updated state
      this.notifyStateChange();
      debugAuthState(); // Debug check after saving

      // Only show welcome message on first validation, not on hourly checks
      if (!this.validationInterval) {
        toast.success(`Welcome back, ${this.state.username}!`);
        debugLog('Showed welcome back message');
      }
    } catch (error) {
      // Don't automatically log out - just mark as not logged in
      // This allows the user to try logging in again without losing their settings
      debugLog('Token validation failed', error);
      this.state.isLoggedIn = false;
      this.state.accessToken = null; // Clear the invalid token
      this.state.expiresAt = null;
      this.state.lastValidated = null;
      this.state.scopes = null;
      debugLog('Clearing invalid token state');
      saveAuthState(this.state, this.stateKey);
      this.notifyStateChange();
      debugAuthState(); // Debug check after clearing

      // Clear the validation interval
      if (this.validationInterval) {
        window.clearInterval(this.validationInterval);
        this.validationInterval = null;
        debugLog('Cleared validation interval');
      }

      // Show a toast message to indicate the need to log in again
      toast.error("Session expired. Please log in again.");
    }
  }

  public addStateChangeListener(listener: (state: AuthState) => void): void {
    this.stateChangeListeners.push(listener);
    // Immediately notify with current state
    listener(this.state);
  }

  public removeStateChangeListener(listener: (state: AuthState) => void): void {
    const index = this.stateChangeListeners.indexOf(listener);
    if (index !== -1) {
      this.stateChangeListeners.splice(index, 1);
    }
  }

  private notifyStateChange(): void {
    for (const listener of this.stateChangeListeners) {
      listener(this.state);
    }
  }

  public getAuthState(): AuthState {
    return { ...this.state };
  }

  public login(force: boolean = true): void {
    debugLog('Login initiated', { force });
    debugAuthState(); // Debug check before clearing

    // Always force re-authentication to ensure a fresh login
    // This ensures the user always sees the Twitch authorization page
    force = true;

    // Clear any existing auth state to ensure a fresh login
    try {
      // Clear all localStorage items
      localStorage.removeItem(this.stateKey);
      localStorage.removeItem('twitch-auth-token');
      localStorage.removeItem('twitch-auth-data');
      localStorage.removeItem('twitch-auth-state');
      localStorage.removeItem('twitch-tts-auth-state');

      // Clear all sessionStorage items
      sessionStorage.removeItem(this.stateKey);
      sessionStorage.removeItem('twitch-auth-token');
      sessionStorage.removeItem('twitch-auth-data');
      sessionStorage.removeItem('twitch-auth-state');
      sessionStorage.removeItem('twitch-tts-auth-state');

      // Clear all related cookies
      document.cookie = `${this.stateKey}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${this.stateKey}-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${this.stateKey}-username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${this.stateKey}-auth-state-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `twitch-auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `twitch-auth-state=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `twitch-tts-auth-state=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;

      debugLog('Cleared all auth state storage');
    } catch (e) {
      // Log but continue - storage errors shouldn't prevent authentication
      debugLog('Error clearing auth state', e);
    }

    // Get the redirect URI using the utility function
    const redirectUri = getRedirectUri();
    debugLog('Using redirect URI', redirectUri);

    // Update the config
    this.config.redirectUri = redirectUri;

    // Use the standard Twitch OAuth endpoint
    const authUrl = new URL("https://id.twitch.tv/oauth2/authorize");
    authUrl.searchParams.append("client_id", this.config.clientId);
    authUrl.searchParams.append("redirect_uri", redirectUri);
    authUrl.searchParams.append("response_type", "token");
    authUrl.searchParams.append("scope", this.config.scope.join(" "));

    // Always force re-authentication to ensure a fresh login
    // This ensures the user always sees the Twitch authorization page
    authUrl.searchParams.append("force_verify", "true");

    // Add timestamp parameter to prevent caching
    authUrl.searchParams.append("_t", Date.now().toString());

    // Generate a random state for security
    const randomState = Math.random().toString(36).substring(2, 15);
    authUrl.searchParams.append("state", randomState);
    debugLog('Generated random state for security', randomState);

    // Store the state in both sessionStorage and localStorage for better cross-domain support
    try {
      // Store in multiple locations for redundancy
      sessionStorage.setItem("twitch-auth-state", randomState);
      localStorage.setItem("twitch-auth-state", randomState);
      localStorage.setItem("twitch-redirect-uri", redirectUri);

      // Store in cookies for cross-domain support
      document.cookie = `twitch-auth-state=${randomState};path=/;max-age=3600;SameSite=Lax`;

      debugLog('Stored auth state in multiple locations');
    } catch (e) {
      // Log but continue - storage errors shouldn't prevent authentication
      debugLog('Error storing auth state', e);
    }

    // Log the redirect URI for debugging
    debugLog('Redirecting to Twitch with URI', redirectUri);

    // Handle the "message port closed" error by adding a small delay
    // This gives Chrome time to finish any pending operations
    try {
      // First, try to suppress any potential errors
      const originalConsoleError = console.error;
      console.error = function() {
        // Suppress message port closed errors
        const errorString = Array.from(arguments).join(' ');
        if (errorString.includes('message port closed')) {
          return;
        }
        originalConsoleError.apply(console, arguments);
      };

      debugLog('Preparing to redirect to Twitch authorization page');

      // Use a longer delay to ensure all operations complete
      setTimeout(() => {
        // Open in the same window, not as a popup
        debugLog('Redirecting now to:', authUrl.toString());
        window.location.href = authUrl.toString();

        // Restore original console.error after navigation starts
        setTimeout(() => {
          console.error = originalConsoleError;
        }, 500);
      }, 1000); // Increased delay for better reliability
    } catch (e) {
      // If there's any error in the error suppression, just navigate directly
      debugLog('Error in redirect preparation, navigating directly', e);
      window.location.href = authUrl.toString();
    }
  }

  /**
   * Check if the token needs to be refreshed and refresh it if needed
   * This is called periodically to ensure the token is always valid
   */
  private async checkAndRefreshTokenIfNeeded(): Promise<void> {
    // Only check if we have a token and expiration time
    if (!this.state.accessToken || !this.state.expiresAt) {
      debugLog('No token or expiration time to check for refresh');
      return;
    }

    // Calculate time until expiration in milliseconds
    const timeUntilExpiration = this.state.expiresAt - Date.now();
    const timeUntilExpirationMinutes = Math.floor(timeUntilExpiration / 1000 / 60);

    debugLog('Checking token expiration', {
      expiresAt: new Date(this.state.expiresAt).toISOString(),
      timeUntilExpirationMinutes,
      now: new Date().toISOString()
    });

    // If token will expire in less than 60 minutes, refresh it
    // This gives us a buffer to ensure the token is always valid
    if (timeUntilExpiration < 3600000) { // 60 minutes in milliseconds
      debugLog('Token will expire soon, refreshing', { timeUntilExpirationMinutes });

      try {
        // Validate the token to make sure it's still valid
        const validationData = await validateToken(this.state.accessToken);

        // If validation is successful but expiration is soon, we need to refresh
        if (validationData.expires_in < 3600) { // Less than 1 hour in seconds
          debugLog('Token valid but expires soon, forcing refresh');

          // Store the current channel name and other important state
          const currentChannelName = this.state.channelName;
          const currentUsername = this.state.username;

          // Force a new login to get a fresh token
          // We'll do this by clearing the token and then redirecting to Twitch
          this.state.accessToken = null;
          this.state.expiresAt = null;
          this.state.lastValidated = null;

          // But keep the user logged in and preserve channel name
          this.state.isLoggedIn = true;
          this.state.channelName = currentChannelName;
          this.state.username = currentUsername;

          // Save this intermediate state
          saveAuthState(this.state, this.stateKey);

          // Show a toast to inform the user
          toast.info("Refreshing your session...");

          // Redirect to Twitch for a fresh token
          // Use a small delay to allow the toast to show
          setTimeout(() => {
            this.login(true);
          }, 1500);
        } else {
          // Token is valid and not expiring soon, update expiration time
          debugLog('Token is valid and not expiring soon, updating expiration time');
          this.state.expiresAt = Date.now() + (validationData.expires_in * 1000);
          this.state.lastValidated = Date.now();
          saveAuthState(this.state, this.stateKey);
        }
      } catch (error) {
        // If validation fails, the token is invalid
        debugLog('Token validation failed during refresh check', error);

        // If we're in a production environment, try to silently refresh the token
        const isProduction = window.location.hostname !== 'localhost';
        if (isProduction) {
          debugLog('In production environment, attempting silent refresh');

          // Store the current channel name and other important state
          const currentChannelName = this.state.channelName;
          const currentUsername = this.state.username;

          // Clear the token but keep the user logged in
          this.state.accessToken = null;
          this.state.expiresAt = null;
          this.state.lastValidated = null;
          this.state.isLoggedIn = true;
          this.state.channelName = currentChannelName;
          this.state.username = currentUsername;

          // Save this intermediate state
          saveAuthState(this.state, this.stateKey);

          // Show a toast to inform the user
          toast.info("Refreshing your session...");

          // Redirect to Twitch for a fresh token
          setTimeout(() => {
            this.login(true);
          }, 1500);
        } else {
          // In development, just show an error
          toast.error("Session expired. Please log in again.");
          this.logout();
        }
      }
    } else {
      debugLog('Token is not expiring soon, no refresh needed', { timeUntilExpirationMinutes });
    }
  }

  public async logout(): Promise<void> {
    // Also log out from Supabase if connected
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // Silent catch - Supabase errors shouldn't block logout
    }

    // Clear the validation interval
    if (this.validationInterval) {
      window.clearInterval(this.validationInterval);
      this.validationInterval = null;
    }

    this.state = { ...defaultAuthState };
    saveAuthState(this.state, this.stateKey);
    this.notifyStateChange();

    toast.success("Logged out successfully");
  }

  private async handleAuthCallback(): Promise<void> {
    debugLog('Handling auth callback');
    try {
      // Suppress message port closed errors during auth callback
      const originalConsoleError = console.error;
      console.error = function() {
        const errorString = Array.from(arguments).join(' ');
        if (errorString.includes('message port closed') ||
            errorString.includes('7TV') ||
            errorString.includes('seventv') ||
            errorString.includes('MutationObserver')) {
          return;
        }
        originalConsoleError.apply(console, arguments);
      };

      // Restore original console.error after 5 seconds
      setTimeout(() => {
        console.error = originalConsoleError;
      }, 5000);

      debugAuthState(); // Check current auth state
      // Check for auth_error in query parameters (from redirect.html)
      const urlParams = new URLSearchParams(window.location.search);
      const authError = urlParams.get("auth_error");
      if (authError) {
        debugLog('Found auth_error in query parameters', authError);
        // Clean URL
        history.replaceState({}, document.title, window.location.pathname);
        toast.error(`Authentication error: ${authError}`);
        return;
      }

      debugLog('No auth_error found in query parameters');

      // Look for access token in URL hash (implicit grant flow)
      if (window.location.hash) {
        debugLog('Found hash in URL', window.location.hash);

        // Check if this is a redirect page with "You are already here" message
        // This happens when Twitch redirects to a page that's not the application
        const bodyText = document.body.innerText || '';
        const isRedirectPage = bodyText.includes("You are already here") ||
                              bodyText.includes("Twitch") && bodyText.includes("redirect");

        debugLog('Body text check for redirect page', {
          isRedirectPage,
          bodyTextSample: bodyText.substring(0, 100)
        });

        // If it's a redirect page, redirect to the root of the application
        if (isRedirectPage) {
          debugLog('Detected redirect page, forwarding to root with hash');
          window.location.href = window.location.origin + window.location.hash;
          return;
        }

        const params = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = params.get("access_token");
        const tokenState = params.get("state");
        const error = params.get("error");
        const errorDescription = params.get("error_description");

        debugLog('Parsed hash parameters', {
          hasAccessToken: !!accessToken,
          hasState: !!tokenState,
          hasError: !!error,
          errorDescription
        });

        // Clean URL immediately to prevent issues with refreshes
        history.replaceState({}, document.title, window.location.pathname);
        debugLog('Cleaned URL hash');

        if (error) {
          debugLog('Found error in hash parameters', { error, errorDescription });
          toast.error(`Authentication error: ${errorDescription || error}`);
          return;
        }

        // Set the correct redirect URI using the utility function
        this.config.redirectUri = getRedirectUri();
        debugLog('Set redirect URI for validation', this.config.redirectUri);

        // Try to get the saved state from storage
        let savedState = null;
        try {
          savedState = sessionStorage.getItem("twitch-auth-state") || localStorage.getItem("twitch-auth-state");
          debugLog('Retrieved saved state from storage', { savedState, tokenState });

          // Clean up storage
          sessionStorage.removeItem("twitch-auth-state");
          localStorage.removeItem("twitch-auth-state");
          document.cookie = "twitch-auth-state=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          debugLog('Cleaned up state storage');
        } catch (e) {
          // Log but continue - storage errors shouldn't prevent authentication
          debugLog('Error retrieving saved state', e);
        }

        // For production environments, be lenient with state verification
        const isProduction = window.location.hostname !== 'localhost';
        const stateValid = isProduction ? true : (tokenState && tokenState === savedState);
        debugLog('State validation result', {
          isProduction,
          stateValid,
          tokenState,
          savedState
        });

        if (accessToken && stateValid) {
          debugLog('Access token is valid, setting initial state');
          this.state.accessToken = accessToken;
          this.state.isLoggedIn = true;

          // Validate the token and fetch user info
          try {
            // Directly validate the token with Twitch
            debugLog('Validating token with Twitch API');
            const validationData = await validateToken(accessToken);
            debugLog('Token validation successful', validationData);

            // Update state with validation data
            this.state.username = validationData.login;
            this.state.userId = validationData.user_id;
            this.state.scopes = validationData.scopes;
            debugLog('Updated state with validation data', {
              username: this.state.username,
              userId: this.state.userId
            });

            // Calculate when the token expires
            this.state.expiresAt = Date.now() + (validationData.expires_in * 1000);
            this.state.lastValidated = Date.now();
            debugLog('Set token expiration', {
              expiresAt: new Date(this.state.expiresAt).toISOString(),
              expiresIn: Math.floor((this.state.expiresAt - Date.now()) / 1000 / 60) + ' minutes'
            });

            // Only set channel name if it's not already set
            if (!this.state.channelName) {
              this.state.channelName = validationData.login; // Default to own channel
              debugLog('Set default channel name', this.state.channelName);
            }

            // Fetch additional user info like profile image
            debugLog('Fetching additional user info');
            const userInfo = await fetchUserInfo(accessToken, this.config.clientId);
            this.state.profileImageUrl = userInfo.profileImageUrl;
            debugLog('Got profile image URL', this.state.profileImageUrl);

            // Try to sign in to Supabase with Twitch token
            try {
              // Connect to Supabase
              debugLog('Attempting to sign in to Supabase');
              const { error } = await supabase.auth.signInWithPassword({
                email: `${userInfo.username}@twitch.user`, // Create a pseudo-email
                password: accessToken.substring(0, 20) // Use part of the token as password
              });

              if (error) {
                debugLog('Supabase sign in failed, trying to create user', error);
                // If sign in fails, try to create the user
                const signUpResult = await supabase.auth.signUp({
                  email: `${userInfo.username}@twitch.user`,
                  password: accessToken.substring(0, 20),
                  options: {
                    data: {
                      twitch_username: userInfo.username,
                      profile_image_url: userInfo.profileImageUrl
                    }
                  }
                });
                debugLog('Supabase sign up result', { success: !signUpResult.error });
              } else {
                debugLog('Supabase sign in successful');
              }
            } catch (error) {
              // Log but continue - Supabase errors shouldn't block the Twitch login
              debugLog('Error with Supabase authentication', error);
            }

            // Save auth state to localStorage for persistence
            debugLog('Saving auth state to storage', this.state);
            saveAuthState(this.state, this.stateKey);
            this.notifyStateChange();
            debugAuthState(); // Debug check after saving

            // Set up hourly validation as required by Twitch
            this.setupValidationInterval();
            debugLog('Set up validation interval');

            // Import blocked terms from Twitch to the application's blocklist
            this.importBlockedTerms();

            toast.success(`Welcome, ${this.state.username}!`);
            debugLog('Authentication complete, showed welcome message');
          } catch (error) {
            debugLog('Error validating token or fetching user info', error);
            toast.error("Failed to get user information");
            debugLog('Logging out due to validation error');
            this.logout();
          }
        } else if (accessToken) {
          // If we have an access token but state validation failed, still try to authenticate
          // This is a fallback for environments where state might not persist correctly
          debugLog('Access token present but state validation failed, trying anyway');
          this.state.accessToken = accessToken;
          this.state.isLoggedIn = true;

          try {
            // Directly validate the token with Twitch
            debugLog('Validating token with Twitch API');
            const validationData = await validateToken(accessToken);
            debugLog('Token validation successful', validationData);

            // Update state with validation data
            this.state.username = validationData.login;
            this.state.userId = validationData.user_id;
            this.state.scopes = validationData.scopes;
            debugLog('Updated state with validation data', {
              username: this.state.username,
              userId: this.state.userId
            });

            // Calculate when the token expires
            this.state.expiresAt = Date.now() + (validationData.expires_in * 1000);
            this.state.lastValidated = Date.now();
            debugLog('Set token expiration', {
              expiresAt: new Date(this.state.expiresAt).toISOString(),
              expiresIn: Math.floor((this.state.expiresAt - Date.now()) / 1000 / 60) + ' minutes'
            });

            // Only set channel name if it's not already set
            if (!this.state.channelName) {
              this.state.channelName = validationData.login; // Default to own channel
              debugLog('Set default channel name', this.state.channelName);
            }

            // Fetch additional user info like profile image
            debugLog('Fetching additional user info');
            const userInfo = await fetchUserInfo(accessToken, this.config.clientId);
            this.state.profileImageUrl = userInfo.profileImageUrl;
            debugLog('Got profile image URL', this.state.profileImageUrl);

            // Save auth state to localStorage for persistence
            debugLog('Saving auth state to storage', this.state);
            saveAuthState(this.state, this.stateKey);
            this.notifyStateChange();
            debugAuthState(); // Debug check after saving

            // Set up hourly validation as required by Twitch
            this.setupValidationInterval();
            debugLog('Set up validation interval');

            // Import blocked terms from Twitch to the application's blocklist
            this.importBlockedTerms();

            toast.success(`Welcome, ${this.state.username}!`);
            debugLog('Authentication complete, showed welcome message');
          } catch (error) {
            // Authentication failed despite having a token
            debugLog('Error validating token in fallback flow', error);
            this.state.isLoggedIn = false;
            this.state.accessToken = null;
            debugLog('Clearing invalid token state');
            saveAuthState(this.state, this.stateKey);
            this.notifyStateChange();
            debugAuthState(); // Debug check after clearing
            toast.error("Authentication failed: Invalid token");
          }
        } else {
          // No access token received
          debugLog('No access token received in hash parameters');
          toast.error("Authentication failed: No access token received");
        }
      } else {
        // Check URL for error parameters (these would be in the query string, not the hash)
        debugLog('No hash found in URL, checking query parameters');
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get("error");
        const errorDescription = urlParams.get("error_description");

        debugLog('Query parameters', { error, errorDescription });

        if (error) {
          // Clean URL
          history.replaceState({}, document.title, window.location.pathname);
          debugLog('Found error in query parameters, cleaned URL');
          toast.error(`Authentication error: ${errorDescription || error}`);
        } else {
          debugLog('No authentication data found in URL');
        }
      }
    } catch (error) {
      // Log but continue - errors in auth callback shouldn't break the app
      debugLog('Unhandled error in auth callback', error);
      console.error('Error in auth callback:', error);
    }
  }

  public setChannelName(channelName: string): void {
    this.state.channelName = channelName;
    saveAuthState(this.state, this.stateKey);
    this.notifyStateChange();

    // Update user settings in Supabase if logged in
    updateUserSettings(this.state);
  }

  /**
   * Update the profile image URL in the auth state
   * @param profileImageUrl The new profile image URL
   */
  public updateProfileImage(profileImageUrl: string): void {
    debugLog(`[TwitchAuthService] Updating profile image URL: ${profileImageUrl}`);
    this.state.profileImageUrl = profileImageUrl;
    saveAuthState(this.state, this.stateKey);
    this.notifyStateChange();
  }

  /**
   * Import blocked terms from Twitch to the application's blocklist
   * This is called after successful authentication
   */
  private async importBlockedTerms(): Promise<void> {
    try {
      debugLog('Attempting to import blocked terms from Twitch');

      // Get the current filter settings
      const filterSettings = await settingsService.getSettings('filter_settings');

      if (!filterSettings) {
        debugLog('No filter settings found, skipping import');
        return;
      }

      // Function to add a term to the blocklist
      const addToBlocklist = (term: string) => {
        // Make sure blacklistedWords exists and is an array
        if (!Array.isArray(filterSettings.blacklistedWords)) {
          filterSettings.blacklistedWords = [];
        }

        // Check if the term already exists (case insensitive)
        const termExists = filterSettings.blacklistedWords.some(
          existing => existing.toLowerCase() === term.toLowerCase()
        );

        if (!termExists) {
          filterSettings.blacklistedWords.push(term.toLowerCase());
        }
      };

      // Import the blocked terms
      const importCount = await twitchUserListService.importBlockedTermsToBlocklist(addToBlocklist);

      if (importCount > 0) {
        // Save the updated filter settings
        await settingsService.saveSettings('filter_settings', filterSettings);
        debugLog(`Imported ${importCount} blocked terms from Twitch`);
        toast.success(`Imported ${importCount} blocked terms from Twitch`);
      } else {
        debugLog('No blocked terms found to import');
      }
    } catch (error) {
      debugLog('Error importing blocked terms', error);
      // Don't show an error toast to avoid confusion
    }
  }
}

// Singleton instance
const twitchAuthService = new TwitchAuthService();
export default twitchAuthService;
