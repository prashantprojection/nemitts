import { useState, useEffect } from 'react';
import twitchAuthService, { AuthState } from '@/services/TwitchAuthService';

/**
 * A hook for managing Twitch authentication
 *
 * @returns Twitch authentication state and functions to manage it
 */
export function useTwitchAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isLoggedIn: false,
    username: null,
    accessToken: null,
    channelName: null,
    profileImageUrl: null,
    userId: null,
    expiresAt: null,
    lastValidated: null,
    scopes: null
  });

  // Load auth state on component mount
  useEffect(() => {
    const state = twitchAuthService.getAuthState();
    setAuthState(state);

    // Listen for auth state changes
    const handleAuthChange = (newState: AuthState) => {
      setAuthState(newState);
    };

    twitchAuthService.addStateChangeListener(handleAuthChange);

    return () => {
      twitchAuthService.removeStateChangeListener(handleAuthChange);
    };
  }, []);

  // Login with Twitch
  const login = () => {
    twitchAuthService.login();
  };

  // Logout from Twitch
  const logout = () => {
    twitchAuthService.logout();
  };

  // Set channel name
  const setChannelName = (channelName: string) => {
    twitchAuthService.setChannelName(channelName);
  };

  return {
    authState,
    login,
    logout,
    setChannelName
  };
}
