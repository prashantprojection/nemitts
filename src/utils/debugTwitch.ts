/**
 * Utility functions for debugging Twitch authentication issues
 */

import { debugLog } from './debugUtils';
import twitchAuthService from '@/services/twitch/TwitchAuthService';

/**
 * Perform a full authentication debug
 * This will check all storage locations and validate the token if present
 */
export const debugTwitchAuth = async (): Promise<void> => {
  debugLog('Starting Twitch auth debug');
  
  // Get current auth state
  const authState = twitchAuthService.getAuthState();
  debugLog('Current auth state', {
    isLoggedIn: authState.isLoggedIn,
    hasToken: !!authState.accessToken,
    username: authState.username,
    channelName: authState.channelName,
    hasProfileImage: !!authState.profileImageUrl,
    expiresAt: authState.expiresAt ? new Date(authState.expiresAt).toISOString() : null,
    lastValidated: authState.lastValidated ? new Date(authState.lastValidated).toISOString() : null,
  });
  
  // Check token validity if present
  if (authState.accessToken) {
    try {
      debugLog('Validating token with Twitch API');
      const response = await fetch("https://id.twitch.tv/oauth2/validate", {
        headers: {
          "Authorization": `OAuth ${authState.accessToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        debugLog('Token is valid', data);
        
        // Check if token is about to expire
        const expiresInSeconds = data.expires_in;
        if (expiresInSeconds < 3600) {
          debugLog('WARNING: Token will expire soon', {
            expiresInSeconds,
            expiresInMinutes: Math.floor(expiresInSeconds / 60),
            expiresInHours: Math.floor(expiresInSeconds / 3600)
          });
        }
      } else {
        const errorText = await response.text();
        debugLog('Token is invalid', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
      }
    } catch (error) {
      debugLog('Error validating token', error);
    }
  } else {
    debugLog('No token to validate');
  }
  
  // Check redirect URI configuration
  const redirectUri = window.location.origin;
  debugLog('Redirect URI configuration', {
    currentOrigin: redirectUri,
    recommendedRedirectURIs: [
      redirectUri,
      `${redirectUri}/redirect.html`,
      `${redirectUri}/callback`
    ]
  });
  
  // Check for any URL parameters that might indicate auth issues
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get('error');
  const errorDescription = urlParams.get('error_description');
  
  if (error) {
    debugLog('Found error in URL parameters', {
      error,
      errorDescription
    });
  }
  
  debugLog('Twitch auth debug complete');
};

/**
 * Force a token refresh by logging out and logging back in
 */
export const forceTwitchTokenRefresh = (): void => {
  debugLog('Forcing token refresh');
  twitchAuthService.logout();
  setTimeout(() => {
    twitchAuthService.login(true);
  }, 1000);
};
