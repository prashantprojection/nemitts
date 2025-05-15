
import { toast } from "sonner";
import { AuthState, defaultAuthState } from "./types";
import { debugLog } from "@/utils/debugUtils";

export const loadAuthState = (stateKey: string): AuthState => {
  debugLog('Loading auth state', { stateKey });
  try {
    // Try localStorage first
    try {
      const savedState = localStorage.getItem(stateKey);
      debugLog('Checking localStorage', { hasState: !!savedState });
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          debugLog('Parsed localStorage state', {
            hasAccessToken: !!parsedState.accessToken,
            isLoggedIn: parsedState.isLoggedIn
          });

          // Check if this is the new format with just accessToken
          if (parsedState.accessToken && !parsedState.isLoggedIn) {
            debugLog('Found token-only format in localStorage');
            const state = { ...defaultAuthState };
            state.accessToken = parsedState.accessToken;
            state.isLoggedIn = true;
            return state;
          }
          return parsedState;
        } catch (e) {
          debugLog('Error parsing localStorage state', e);
        }
      }

      // Also check for separate token storage
      const authToken = localStorage.getItem('twitch-auth-token');
      if (authToken) {
        debugLog('Found separate auth token in localStorage');
        const state = { ...defaultAuthState };
        state.accessToken = authToken;
        state.isLoggedIn = true;
        return state;
      }
    } catch (e) {
      debugLog('Error accessing localStorage', e);
    }

    // Try sessionStorage as fallback
    try {
      const sessionState = sessionStorage.getItem(stateKey);
      debugLog('Checking sessionStorage', { hasState: !!sessionState });
      if (sessionState) {
        try {
          const parsedState = JSON.parse(sessionState);
          debugLog('Parsed sessionStorage state', {
            hasAccessToken: !!parsedState.accessToken,
            isLoggedIn: parsedState.isLoggedIn
          });

          // Check if this is the new format with just accessToken
          if (parsedState.accessToken && !parsedState.isLoggedIn) {
            debugLog('Found token-only format in sessionStorage');
            const state = { ...defaultAuthState };
            state.accessToken = parsedState.accessToken;
            state.isLoggedIn = true;
            return state;
          }
          return parsedState;
        } catch (e) {
          debugLog('Error parsing sessionStorage state', e);
        }
      }

      // Also check for separate token storage
      const authToken = sessionStorage.getItem('twitch-auth-token');
      if (authToken) {
        debugLog('Found separate auth token in sessionStorage');
        const state = { ...defaultAuthState };
        state.accessToken = authToken;
        state.isLoggedIn = true;
        return state;
      }
    } catch (e) {
      debugLog('Error accessing sessionStorage', e);
    }

    // Try cookies as a last resort
    try {
      debugLog('Checking cookies');
      const cookies = document.cookie.split(';');
      debugLog('Found cookies', { count: cookies.length });

      let fullStateCookie = null;
      let tokenCookie = null;
      let usernameCookie = null;
      let simplifiedTokenCookie = null;
      let authTokenCookie = null;

      // First pass: look for all possible cookies
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === stateKey && value) {
          fullStateCookie = value;
          debugLog('Found full state cookie');
        } else if (name === `${stateKey}-token` && value) {
          tokenCookie = value;
          debugLog('Found token cookie');
        } else if (name === `${stateKey}-username` && value) {
          usernameCookie = value;
          debugLog('Found username cookie');
        } else if (name === `${stateKey}-auth-state-token` && value) {
          simplifiedTokenCookie = value;
          debugLog('Found simplified token cookie');
        } else if (name === 'twitch-auth-token' && value) {
          authTokenCookie = value;
          debugLog('Found auth token cookie');
        }
      }

      // Try to use the full state cookie
      if (fullStateCookie) {
        try {
          const decodedValue = decodeURIComponent(fullStateCookie);
          debugLog('Decoded full state cookie');
          const parsedState = JSON.parse(decodedValue);
          debugLog('Parsed full state cookie', {
            hasAccessToken: !!parsedState.accessToken,
            isLoggedIn: parsedState.isLoggedIn
          });

          // Check if this is the new format with just accessToken
          if (parsedState.accessToken && !parsedState.isLoggedIn) {
            debugLog('Found token-only format in full state cookie');
            const state = { ...defaultAuthState };
            state.accessToken = parsedState.accessToken;
            state.isLoggedIn = true;
            return state;
          }
          return parsedState;
        } catch (e) {
          // Invalid JSON in cookie, fall through to individual cookies
          debugLog('Error parsing full state cookie', e);
        }
      }

      // Check for the simplified token cookie first (from redirect.html)
      if (simplifiedTokenCookie) {
        debugLog('Using simplified token cookie');
        const partialState = { ...defaultAuthState };
        partialState.accessToken = decodeURIComponent(simplifiedTokenCookie);
        partialState.isLoggedIn = true;
        return partialState;
      }

      // Check for the auth token cookie
      if (authTokenCookie) {
        debugLog('Using auth token cookie');
        const partialState = { ...defaultAuthState };
        partialState.accessToken = decodeURIComponent(authTokenCookie);
        partialState.isLoggedIn = true;
        return partialState;
      }

      // If we have individual cookies, construct a partial state
      if (tokenCookie || usernameCookie) {
        debugLog('Using individual cookies');
        const partialState = { ...defaultAuthState };

        if (tokenCookie) {
          partialState.accessToken = decodeURIComponent(tokenCookie);
          partialState.isLoggedIn = true;
          debugLog('Set access token from token cookie');
        }

        if (usernameCookie) {
          partialState.username = decodeURIComponent(usernameCookie);
          debugLog('Set username from username cookie', { username: partialState.username });
          // If we have a username but no channel name, use the username as channel
          if (!partialState.channelName) {
            partialState.channelName = partialState.username;
            debugLog('Set default channel name to username');
          }
        }

        return partialState;
      }

      debugLog('No auth data found in cookies');
    } catch (e) {
      debugLog('Error checking cookies', e);
    }
  } catch (error) {
    // Log but continue
    debugLog('Unhandled error in loadAuthState', error);
  }

  debugLog('No auth state found, returning default state');
  return { ...defaultAuthState };
};

export const saveAuthState = (state: AuthState, stateKey: string): void => {
  try {
    debugLog('Saving auth state', { stateKey, hasToken: !!state.accessToken });

    // Create a JSON string of the state
    const stateStr = JSON.stringify(state);

    // Save to localStorage with a longer expiration
    try {
      localStorage.setItem(stateKey, stateStr);
      debugLog('Saved to localStorage');

      // Also save token separately for redundancy
      if (state.accessToken) {
        localStorage.setItem('twitch-auth-token', state.accessToken);
        localStorage.setItem('twitch-auth-data', JSON.stringify({
          accessToken: state.accessToken,
          timestamp: Date.now()
        }));
        debugLog('Saved token separately to localStorage');
      }
    } catch (e) {
      debugLog('Error saving to localStorage', e);
    }

    // Save to sessionStorage for the current session
    try {
      sessionStorage.setItem(stateKey, stateStr);
      debugLog('Saved to sessionStorage');

      // Also save token separately for redundancy
      if (state.accessToken) {
        sessionStorage.setItem('twitch-auth-token', state.accessToken);
        sessionStorage.setItem('twitch-auth-data', JSON.stringify({
          accessToken: state.accessToken,
          timestamp: Date.now()
        }));
        debugLog('Saved token separately to sessionStorage');
      }
    } catch (e) {
      debugLog('Error saving to sessionStorage', e);
    }

    // Save as a cookie with a long expiration for cross-domain support
    try {
      const encodedState = encodeURIComponent(stateStr);
      // Set cookie with 30-day expiration (2592000 seconds)
      document.cookie = `${stateKey}=${encodedState};path=/;max-age=2592000;SameSite=Lax`;
      debugLog('Saved full state to cookie');

      // Also save token separately for redundancy
      if (state.accessToken) {
        document.cookie = `twitch-auth-token=${encodeURIComponent(state.accessToken)};path=/;max-age=2592000;SameSite=Lax`;
        debugLog('Saved token separately to cookie');
      }
    } catch (e) {
      debugLog('Error saving to cookies', e);
    }

    // Also save individual key pieces as separate cookies for redundancy
    if (state.accessToken) {
      try {
        document.cookie = `${stateKey}-token=${encodeURIComponent(state.accessToken)};path=/;max-age=2592000;SameSite=Lax`;
        debugLog('Saved token to specific cookie');
      } catch (e) {
        debugLog('Error saving token to specific cookie', e);
      }
    }

    if (state.username) {
      try {
        document.cookie = `${stateKey}-username=${encodeURIComponent(state.username)};path=/;max-age=2592000;SameSite=Lax`;
        debugLog('Saved username to specific cookie');
      } catch (e) {
        debugLog('Error saving username to specific cookie', e);
      }
    }
  } catch (error) {
    // Log but continue
    debugLog('Unhandled error in saveAuthState', error);
  }
};

export interface TwitchValidationResponse {
  client_id: string;
  login: string;
  scopes: string[];
  user_id: string;
  expires_in: number;
}

export const validateToken = async (accessToken: string): Promise<TwitchValidationResponse> => {
  try {
    debugLog('Validating token with Twitch API');
    const response = await fetch("https://id.twitch.tv/oauth2/validate", {
      headers: {
        "Authorization": `OAuth ${accessToken}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      debugLog('Token validation failed', { status: response.status, error: errorText });
      throw new Error(`Token validation failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    debugLog('Token validation successful', data);
    return data;
  } catch (error) {
    debugLog('Error in validateToken', error);
    throw error;
  }
};

export const fetchUserInfo = async (accessToken: string, clientId: string): Promise<{
  username: string;
  profileImageUrl: string;
  userId: string;
  scopes: string[];
  expiresIn: number;
}> => {
  try {
    debugLog('Fetching user info');
    // First validate the token with Twitch
    const validationData = await validateToken(accessToken);

    // Extract validation data
    const { login, user_id, scopes, expires_in } = validationData;
    debugLog('Got validation data', { login, user_id });

    // Now fetch the user info to get the profile image URL
    debugLog('Fetching user profile from Twitch API');
    const response = await fetch("https://api.twitch.tv/helix/users", {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Client-Id": clientId
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      debugLog('Failed to get user info', { status: response.status, error: errorText });
      throw new Error(`Failed to get user info: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    debugLog('Got user data from Twitch API', { hasData: !!data.data, dataLength: data.data?.length });

    if (data.data && data.data.length > 0) {
      const user = data.data[0];
      const result = {
        username: login, // Use the login from validation response
        profileImageUrl: user.profile_image_url,
        userId: user_id, // Use the user_id from validation response
        scopes: scopes, // Use the scopes from validation response
        expiresIn: expires_in // Use the expires_in from validation response
      };
      debugLog('User info complete', { username: result.username, userId: result.userId });
      return result;
    }

    debugLog('No user data found in Twitch API response');
    throw new Error('No user data found');
  } catch (error) {
    debugLog('Error in fetchUserInfo', error);
    throw error;
  }
};
