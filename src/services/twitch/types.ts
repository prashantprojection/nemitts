
export interface AuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string[];
}

export interface AuthState {
  accessToken: string | null;
  isLoggedIn: boolean;
  username: string | null;
  channelName: string | null;
  profileImageUrl: string | null;
  userId: string | null;
  expiresAt: number | null; // Timestamp when the token expires
  lastValidated: number | null; // Timestamp of last validation
  scopes: string[] | null; // Scopes granted to the token
}

export const defaultAuthState: AuthState = {
  accessToken: null,
  isLoggedIn: false,
  username: null,
  channelName: null,
  profileImageUrl: null,
  userId: null,
  expiresAt: null,
  lastValidated: null,
  scopes: null
};

// For MVP, we'll use these constants directly
// In a production app, you'd want to use environment variables
export const CLIENT_ID = "vujwln85ho3n32bitmn68rspe75prp";
export const SCOPES = [
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
  "user:read:moderated_channels", // Added to get list of channels where user is a moderator

  // User Related
  "user:read:follows",
  "user:read:subscriptions",
  "user:read:blocked_users",
  "user:read:emotes"
];

// Get the correct redirect URI based on the current environment
export const getRedirectUri = (): string => {
  // Always use the current origin with the redirect page
  // This ensures the redirect URI always matches the current domain and port
  return `${window.location.origin}/redirect.html`;
};
