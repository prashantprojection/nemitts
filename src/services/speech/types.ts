
export interface SpeechOptions {
  voice?: SpeechSynthesisVoice;
  voiceName?: string; // Added for direct voice name reference
  rate?: number;
  pitch?: number;
  volume?: number;
  speakUsernames?: boolean;
  randomizeVoice?: boolean; // Whether to use a random voice for each message
  includedVoicesForRandomization?: string[]; // List of voice names to include in randomization
  excludedVoicesForRandomization?: string[]; // List of voice names to exclude from randomization
  // Options for advanced filtering
  filterSettings?: MessageFilterSettings;
  userVoiceAssignments?: UserVoiceAssignment[];
  externalTtsEnabled?: boolean;
  externalTtsApiKey?: string;
  externalTtsVoiceId?: string;
}

export interface SpeechQueueItem {
  text: string;
  priority?: number;
  username?: string; // Added to track message source
  messageId?: string; // Added to track original message
}

// New interfaces for advanced filtering
export interface MessageFilterSettings {
  enabled: boolean;
  keywordBlacklist: string[]; // Words to skip
  userBlacklist: string[]; // Users to skip
  speakUsernames?: boolean; // Say usernames when reading messages
  useNicknames?: boolean; // Use nicknames instead of usernames when speaking
  userNicknames?: UserNickname[]; // Nickname mappings for users
  skipEmojisInMessage?: boolean; // Skip emojis in messages
  skipLinksInMessage?: boolean; // Skip links in messages
  skipBotMessages?: boolean; // Skip messages from bots
  specificUsersOnly?: boolean; // Only read messages from specific users
  specificUsersList?: string[]; // List of specific users to read
  wordReplacements?: WordReplacement[]; // Word replacements for TTS
  minMessageLength?: number;
  maxMessageLength?: number;
  userCooldown?: number; // Seconds between messages from same user
  priorityUsers: string[]; // Users whose messages get higher priority
}

// RegexFilter interface removed as it's no longer used

export interface UserNickname {
  username: string;
  nickname: string;
}

export interface WordReplacement {
  pattern: string; // Regex pattern to match
  replacement: string; // Text to replace with
  caseSensitive: boolean; // Whether the match should be case sensitive
  wholeWord: boolean; // Whether to match whole words only
}

export interface UserVoiceAssignment {
  username: string;
  voiceName: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

// Default filter settings
export const defaultFilterSettings: MessageFilterSettings = {
  enabled: true,
  keywordBlacklist: [],
  userBlacklist: [],
  speakUsernames: true,
  useNicknames: false,
  userNicknames: [],
  skipEmojisInMessage: true,
  skipLinksInMessage: true,
  skipBotMessages: true,
  specificUsersOnly: false,
  specificUsersList: [],
  wordReplacements: [],
  minMessageLength: 0,
  maxMessageLength: 500,
  userCooldown: 0,
  priorityUsers: []
};
