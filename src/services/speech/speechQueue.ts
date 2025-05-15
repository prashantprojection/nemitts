
// Toast functionality removed
import { MessageFilterSettings, SpeechOptions, SpeechQueueItem, UserVoiceAssignment, defaultFilterSettings } from "./types";
import messageFilter from "./messageFilter";
import externalTtsService from "./externalTts";
import twitchUserListService from "../twitch/TwitchUserListService";

// For tracking user message timestamps (for cooldown)
interface UserMessageTimestamp {
  username: string;
  timestamp: number;
}

export class SpeechQueue {
  private synth: SpeechSynthesis;
  private queue: SpeechQueueItem[] = [];
  private speaking: boolean = false;
  private options: SpeechOptions = {
    rate: 1,
    pitch: 1,
    volume: 1,
    speakUsernames: true,
    filterSettings: { ...defaultFilterSettings },
    userVoiceAssignments: [],
    externalTtsEnabled: false
  };
  private userMessageTimestamps: UserMessageTimestamp[] = [];

  constructor() {
    this.synth = window.speechSynthesis;
  }

  public setOptions(options: SpeechOptions): void {
    // If options includes a voiceName but no voice object, try to find the voice
    if (options.voiceName && !options.voice) {
      const voices = this.synth.getVoices();
      options.voice = voices.find(v => v.name === options.voiceName);
    }

    this.options = { ...this.options, ...options };

    // Update message filter with new settings
    if (options.filterSettings) {
      messageFilter.updateSettings(options.filterSettings);
    }
  }

  public getOptions(): SpeechOptions {
    return { ...this.options };
  }

  public speak(text: string, priority: number = 0, username?: string, messageId?: string): void {
    if (!text) {
      return;
    }

    // Check if the text is too long and needs to be chunked
    const maxChunkSize = 300; // Safe limit for most TTS systems

    if (text.length > maxChunkSize) {
      console.log(`Message too long (${text.length} chars), chunking into smaller pieces`);

      // Split by sentences if possible
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
      let currentChunk = "";
      let chunkIndex = 0;

      // Process each sentence
      for (const sentence of sentences) {
        // If adding this sentence would make the chunk too long, add current chunk to queue and start a new one
        if (currentChunk.length + sentence.length > maxChunkSize) {
          if (currentChunk) {
            // Add chunk to queue with same priority and metadata
            this.queue.push({
              text: currentChunk,
              priority,
              username,
              messageId: messageId ? `${messageId}-chunk-${chunkIndex}` : undefined
            });
            chunkIndex++;
          }
          currentChunk = sentence.trim();
        } else {
          // Add sentence to current chunk
          currentChunk += (currentChunk ? " " : "") + sentence.trim();
        }
      }

      // Add any remaining text as the final chunk
      if (currentChunk) {
        this.queue.push({
          text: currentChunk,
          priority,
          username,
          messageId: messageId ? `${messageId}-chunk-${chunkIndex}` : undefined
        });
      }
    } else {
      // Normal case - add to queue as is
      this.queue.push({ text, priority, username, messageId });
    }

    // Sort queue by priority (higher priority items first)
    this.queue.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // Start processing if not already speaking
    if (!this.speaking) {
      void this.processQueue();
    }
  }

  public async shouldReadMessage(message: string, username?: string): Promise<boolean> {
    // Skip messages that start with '!' to bypass TTS (basic filter)
    if (message.trim().startsWith('!')) return false;

    // Use the messageFilter for advanced filtering
    // Each filter option works independently, regardless of the 'enabled' setting
    return await messageFilter.shouldReadMessage(message, username);
  }

  public formatMessageForSpeech(username: string, message: string): string {
    console.log(`[SpeechQueue] Formatting message for speech. Username: ${username}, Message: ${message.substring(0, 30)}...`);

    // Format the message with or without the username based on settings
    // Make sure we're getting the latest value from filter settings
    const speakUsernames = this.options.filterSettings?.speakUsernames === true;
    const useNicknames = this.options.filterSettings?.useNicknames === true;

    // Clean up username - remove any special characters that might cause issues
    let cleanUsername = username;
    if (username.includes('first-msg=') || username.includes('flags=')) {
      // This is a special case where the username contains Twitch metadata
      // Extract just the actual username part
      const usernameMatch = username.match(/user-type=\s*([a-zA-Z0-9_]+)/);
      if (usernameMatch && usernameMatch[1]) {
        cleanUsername = usernameMatch[1];
        console.log(`[SpeechQueue] Extracted username from metadata: ${cleanUsername}`);
      } else {
        // If we can't extract the username, use a generic one
        cleanUsername = "user";
      }
    }

    // Get nickname if available and enabled
    let displayName = cleanUsername;
    if (useNicknames && this.options.filterSettings?.userNicknames?.length) {
      const nicknameEntry = this.options.filterSettings.userNicknames.find(
        entry => entry.username.toLowerCase() === cleanUsername.toLowerCase()
      );
      if (nicknameEntry) {
        displayName = nicknameEntry.nickname;
      }
    }

    // Process message to remove emojis and links if needed
    let processedMessage = message;

    if (this.options.filterSettings?.skipEmojisInMessage) {
      // Replace emojis with empty string
      processedMessage = processedMessage.replace(/[\p{Emoji}]/gu, '');
    }

    if (this.options.filterSettings?.skipLinksInMessage) {
      // Replace URLs with empty string
      processedMessage = processedMessage.replace(/(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi, '');
    }

    // Apply word replacements if any are defined
    if (this.options.filterSettings?.wordReplacements?.length) {
      for (const replacement of this.options.filterSettings.wordReplacements) {
        try {
          // Create regex based on settings
          let flags = replacement.caseSensitive ? 'g' : 'gi';
          let pattern = replacement.pattern;

          // If whole word matching is enabled, add word boundary markers
          if (replacement.wholeWord) {
            pattern = `\\b${pattern}\\b`;
          }

          const regex = new RegExp(pattern, flags);
          processedMessage = processedMessage.replace(regex, replacement.replacement);
        } catch (error) {
          // Silently ignore invalid regex patterns
          console.error('Invalid regex pattern in word replacement:', error);
        }
      }
    }

    // Trim any extra spaces created by replacements
    processedMessage = processedMessage.replace(/\s+/g, ' ').trim();

    // If the message is empty after processing, return a placeholder
    if (!processedMessage) {
      return speakUsernames ? `${displayName} sent a message with no readable content` : 'Message with no readable content';
    }

    // Format the final message
    const formattedMessage = speakUsernames
      ? `${displayName} says: ${processedMessage}`
      : processedMessage;

    console.log(`[SpeechQueue] Formatted message: ${formattedMessage.substring(0, 50)}...`);
    return formattedMessage;
  }

  /**
   * Calculate priority for a message based on filter settings
   * Higher numbers = higher priority
   */
  public calculateMessagePriority(message: string, username?: string): number {
    // Use the messageFilter to calculate message priority
    return messageFilter.calculateMessagePriority(message, username);
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.speaking = false;
      // Clear the current message when queue is empty
      if (window.speechService) {
        window.speechService.setCurrentMessage(null);
      }
      return;
    }

    // Don't process queue if paused
    if (this.paused) {
      return;
    }

    this.speaking = true;
    const item = this.queue.shift();
    if (!item) {
      this.speaking = false;
      // Clear the current message when no item is found
      if (window.speechService) {
        window.speechService.setCurrentMessage(null);
      }
      return;
    }

    // Set the current message being spoken
    if (window.speechService) {
      window.speechService.setCurrentMessage(item);
    }

    try {
      // Check if we should use external TTS API
      if (this.options.externalTtsEnabled && this.options.externalTtsApiKey) {
        this.processWithExternalTts(item);
        return;
      }

      // Use browser TTS
      await this.processWithBrowserTts(item);
    } catch (error) {
      console.error('Error speaking:', error);
      // Show notification in status bar instead of toast
      window.dispatchEvent(new CustomEvent('status-notification', {
        detail: {
          type: 'error',
          message: 'Failed to process text-to-speech'
        }
      }));
      // Continue with next in queue
      void this.processQueue();
    }
  }

  /**
   * Process a queue item with browser's built-in TTS
   */
  private async processWithBrowserTts(item: SpeechQueueItem): Promise<void> {
    try {
      // Browser TTS has limitations on text length
      // Chrome typically has a limit around 200-300 characters
      const maxUtteranceLength = 200;

      if (item.text.length > maxUtteranceLength) {
        console.log(`Message too long for browser TTS (${item.text.length} chars), chunking into smaller pieces`);

        // Split long text into smaller chunks for browser TTS
        const chunks = this.splitTextIntoChunks(item.text, maxUtteranceLength);
        let chunkIndex = 0;

        // Process each chunk sequentially
        const processChunk = async (index: number) => {
          if (index >= chunks.length) {
            // All chunks processed
            this.speaking = false;
            void this.processQueue();
            return;
          }

          const chunk = chunks[index];
          const utterance = new SpeechSynthesisUtterance(chunk);

          // Apply voice settings
          await this.applyVoiceSettings(utterance, item.username);

          // When this chunk ends, process the next one
          utterance.onend = () => processChunk(index + 1);

          utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            // Continue with next chunk despite error
            processChunk(index + 1);
          };

          // Speak this chunk
          this.synth.speak(utterance);
        };

        // Start processing chunks
        await processChunk(0);
      } else {
        // Normal case - text is short enough for a single utterance
        const utterance = new SpeechSynthesisUtterance(item.text);

        // Apply voice settings
        await this.applyVoiceSettings(utterance, item.username);

        // Set up event handlers
        utterance.onend = () => {
          this.speaking = false;
          void this.processQueue();
        };

        utterance.onerror = () => {
          this.speaking = false;
          void this.processQueue();
        };

        // Speak
        this.synth.speak(utterance);
      }
    } catch (error) {
      console.error('Error with browser TTS:', error);
      this.speaking = false;
      void this.processQueue();
    }
  }

  /**
   * Apply voice settings to an utterance
   */
  private async applyVoiceSettings(utterance: SpeechSynthesisUtterance, username?: string): Promise<void> {
    // Get available voices
    const voices = this.synth.getVoices();

    // IMPORTANT: Check for randomization FIRST, before any user-specific voice assignments
    // This ensures randomization takes precedence over user-specific voices when enabled
    if (this.options.randomizeVoice && voices.length > 0) {
      // Start with all available voices
      let availableVoices = [...voices];

      // If we have included voices, only use those
      if (this.options.includedVoicesForRandomization && this.options.includedVoicesForRandomization.length > 0) {
        availableVoices = voices.filter(voice =>
          this.options.includedVoicesForRandomization?.includes(voice.name)
        );
      }
      // If we have excluded voices, filter those out
      else if (this.options.excludedVoicesForRandomization && this.options.excludedVoicesForRandomization.length > 0) {
        availableVoices = voices.filter(voice =>
          !this.options.excludedVoicesForRandomization?.includes(voice.name)
        );
      }

      // If no voices are available after filtering, use all voices
      if (availableVoices.length === 0) {
        availableVoices = voices;
      }

      // Select a random voice from the filtered list
      const randomIndex = Math.floor(Math.random() * availableVoices.length);
      utterance.voice = availableVoices[randomIndex];

      // Dispatch an event to show which voice was selected
      window.dispatchEvent(new CustomEvent('status-notification', {
        detail: {
          type: 'info',
          message: `Random voice: ${utterance.voice.name}`
        }
      }));
    }
    // Check for user-specific voice assignment ONLY if randomization is disabled
    else if (!this.options.randomizeVoice && username && this.options.userVoiceAssignments?.length) {
      // Find a direct match for this username
      const userAssignment = this.options.userVoiceAssignments.find(
        assignment => assignment.username.toLowerCase() === username.toLowerCase()
      );

      if (userAssignment) {
        // Try to find the voice by name
        const voice = voices.find(v => v.name === userAssignment.voiceName);
        if (voice) {
          utterance.voice = voice;
          // Apply user-specific rate, pitch, and volume if provided
          if (userAssignment.rate !== undefined) utterance.rate = userAssignment.rate;
          if (userAssignment.pitch !== undefined) utterance.pitch = userAssignment.pitch;
          if (userAssignment.volume !== undefined) utterance.volume = userAssignment.volume;
          return; // Skip applying default settings
        }
      }
    }
    // Apply default options if no random or user-specific voice was applied
    if (!utterance.voice) {
      if (this.options.voice) {
        utterance.voice = this.options.voice;
      } else if (this.options.voiceName) {
        // Try to find the voice by name if voice object is not set
        const voice = voices.find(v => v.name === this.options.voiceName);
        if (voice) {
          utterance.voice = voice;
        }
      }
    }

    if (this.options.rate !== undefined) utterance.rate = this.options.rate;
    if (this.options.pitch !== undefined) utterance.pitch = this.options.pitch;
    if (this.options.volume !== undefined) utterance.volume = this.options.volume;

    // Check for user-specific voice settings ONLY if randomization is disabled
    if (!this.options.randomizeVoice && username && this.options.userVoiceAssignments?.length) {
      // First priority: Check for exact username match
      const exactMatch = this.options.userVoiceAssignments.find(
        assignment => assignment.username.toLowerCase() === username.toLowerCase()
      );

      // First check for exact username match (highest priority)
      if (exactMatch) {
        // Found exact username match - highest priority
        // Find the voice by name
        if (exactMatch.voiceName) {
          const voices = this.synth.getVoices();
          const voice = voices.find(v => v.name === exactMatch.voiceName);
          if (voice) {
            utterance.voice = voice;
          }
        }

        // Apply user-specific settings if provided
        if (exactMatch.rate !== undefined) utterance.rate = exactMatch.rate;
        if (exactMatch.pitch !== undefined) utterance.pitch = exactMatch.pitch;
        if (exactMatch.volume !== undefined) utterance.volume = exactMatch.volume;

        // Return early since individual assignments have highest priority
        return;
      }
    } else if (this.options.randomizeVoice) {
      return; // Skip the rest of the user voice assignment logic if randomization is enabled
    }

    // If no exact match, check for Twitch user types in priority order
    // (This code will only run if randomization is disabled)

    // Second priority: Check for moderator assignment
    const moderatorAssignment = this.options.userVoiceAssignments.find(
      assignment => assignment.username === '@moderators'
    );

    // Third priority: Check for VIP assignment
    const vipAssignment = this.options.userVoiceAssignments.find(
      assignment => assignment.username === '@vips'
    );

    // Fourth priority: Check for subscriber assignment
    const subscriberAssignment = this.options.userVoiceAssignments.find(
      assignment => assignment.username === '@subscribers'
    );

    // Fifth priority: Check for general audience assignment
    const generalAssignment = this.options.userVoiceAssignments.find(
      assignment => assignment.username === '@general'
    );

    // Apply the highest priority assignment that matches
    let appliedAssignment = null;

    // Check if user is a moderator
    if (moderatorAssignment && await this.isModerator(username)) {
      appliedAssignment = moderatorAssignment;
    }
    // If not a moderator or no moderator assignment, check if user is a VIP
    else if (vipAssignment && await this.isVIP(username)) {
      appliedAssignment = vipAssignment;
    }
    // If not a VIP or no VIP assignment, check if user is a subscriber
    else if (subscriberAssignment && await this.isSubscriber(username)) {
      appliedAssignment = subscriberAssignment;
    }
    // If no other matches, use general audience assignment
    else if (generalAssignment) {
      appliedAssignment = generalAssignment;
    }

    // Apply the assignment if one was found
    if (appliedAssignment?.voiceName) {
      const voices = this.synth.getVoices();
      const voice = voices.find(v => v.name === appliedAssignment.voiceName);
      if (voice) utterance.voice = voice;

      // Apply settings
      if (appliedAssignment.rate !== undefined) utterance.rate = appliedAssignment.rate;
      if (appliedAssignment.pitch !== undefined) utterance.pitch = appliedAssignment.pitch;
      if (appliedAssignment.volume !== undefined) utterance.volume = appliedAssignment.volume;
    }

    // If no username or no match found above, check for general audience voice
    // (This code will only run if randomization is disabled)
    if (!this.options.randomizeVoice && this.options.userVoiceAssignments?.length) {
      // If no username, check for general audience voice
      const generalAssignment = this.options.userVoiceAssignments.find(
        assignment => assignment.username === '@general'
      );

      if (generalAssignment?.voiceName) {
        const voices = this.synth.getVoices();
        const voice = voices.find(v => v.name === generalAssignment.voiceName);
        if (voice) utterance.voice = voice;

        // Apply general audience settings
        if (generalAssignment.rate !== undefined) utterance.rate = generalAssignment.rate;
        if (generalAssignment.pitch !== undefined) utterance.pitch = generalAssignment.pitch;
        if (generalAssignment.volume !== undefined) utterance.volume = generalAssignment.volume;
      }
    }
  }

  /**
   * Split text into smaller chunks at sentence or phrase boundaries
   */
  private splitTextIntoChunks(text: string, maxLength: number): string[] {
    const chunks: string[] = [];

    // Try to split by sentences first
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];

    if (sentences.length === 0) {
      // No sentence boundaries found, fall back to splitting by commas or spaces
      const parts = text.split(/([,;])/);
      let currentChunk = "";

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        if (currentChunk.length + part.length <= maxLength) {
          currentChunk += part;
        } else {
          // If the current part is too long by itself, split by spaces
          if (currentChunk.length === 0 && part.length > maxLength) {
            const words = part.split(/(\s+)/);
            let wordChunk = "";

            for (const word of words) {
              if (wordChunk.length + word.length <= maxLength) {
                wordChunk += word;
              } else {
                if (wordChunk.length > 0) {
                  chunks.push(wordChunk.trim());
                }

                // If a single word is too long, we have to split it
                if (word.length > maxLength) {
                  for (let j = 0; j < word.length; j += maxLength) {
                    chunks.push(word.substring(j, j + maxLength));
                  }
                  wordChunk = "";
                } else {
                  wordChunk = word;
                }
              }
            }

            if (wordChunk.length > 0) {
              chunks.push(wordChunk.trim());
            }
          } else {
            // Add the current chunk and start a new one
            if (currentChunk.length > 0) {
              chunks.push(currentChunk.trim());
            }
            currentChunk = part;
          }
        }
      }

      // Add any remaining text
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
      }
    } else {
      // Process sentences
      let currentChunk = "";

      for (const sentence of sentences) {
        if (sentence.length > maxLength) {
          // This sentence is too long by itself, need to split it further
          if (currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = "";
          }

          // Split this long sentence recursively
          const subChunks = this.splitTextIntoChunks(sentence, maxLength);
          chunks.push(...subChunks);
        } else if (currentChunk.length + sentence.length <= maxLength) {
          // Add to current chunk
          currentChunk += sentence;
        } else {
          // Start a new chunk
          if (currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
          }
          currentChunk = sentence;
        }
      }

      // Add any remaining text
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
      }
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * Process a queue item with an external TTS API (ElevenLabs)
   */
  private async processWithExternalTts(item: SpeechQueueItem): Promise<void> {
    try {
      // Initialize external TTS service if needed
      if (!externalTtsService.isInitialized() && this.options.externalTtsApiKey) {
        externalTtsService.initialize(this.options.externalTtsApiKey);
      }

      // Check if we have a user-specific voice assignment
      let voiceId: string | undefined;
      if (item.username && this.options.userVoiceAssignments?.length) {
        // Find all matching voice assignments for this username
        const matchingAssignments = this.options.userVoiceAssignments.filter(
          assignment => assignment.username.toLowerCase() === item.username?.toLowerCase()
        );

        // Sort by priority (higher priority first)
        const sortedAssignments = matchingAssignments.sort((a, b) => (b.priority || 0) - (a.priority || 0));

        // If no exact username match, check for user type assignments (subscriber, VIP, etc.)
        if (sortedAssignments.length === 0) {
          // Get user type assignments sorted by priority
          const typeAssignments = this.options.userVoiceAssignments
            .filter(assignment =>
              // Filter by user type assignments (usernames that start with '@')
              assignment.username.startsWith('@') &&
              // Check if the user type matches
              (assignment.username === '@subscriber' ||
               assignment.username === '@vip' ||
               assignment.username === '@moderator')
            )
            .sort((a, b) => (b.priority || 0) - (a.priority || 0));

          if (typeAssignments.length > 0 && typeAssignments[0].voiceName) {
            // Find the ElevenLabs voice ID that matches this name
            const voices = externalTtsService.getVoices();
            const voice = voices.find(v => v.name === typeAssignments[0].voiceName);
            if (voice) {
              voiceId = voice.voice_id;
            }
          } else {
            // If no user type match, check for general audience voice
            const generalAssignment = this.options.userVoiceAssignments.find(
              assignment => assignment.username === '@general'
            );

            if (generalAssignment?.voiceName) {
              const voices = externalTtsService.getVoices();
              const voice = voices.find(v => v.name === generalAssignment.voiceName);
              if (voice) {
                voiceId = voice.voice_id;
              }
            }
          }
        } else if (sortedAssignments[0]?.voiceName) {
          // Use the highest priority assignment for this specific user
          // Find the ElevenLabs voice ID that matches this name
          const voices = externalTtsService.getVoices();
          const voice = voices.find(v => v.name === sortedAssignments[0].voiceName);
          if (voice) {
            voiceId = voice.voice_id;
          }
        }
      } else {
        // If no username, check for general audience voice
        const generalAssignment = this.options.userVoiceAssignments?.find(
          assignment => assignment.username === '@general'
        );

        if (generalAssignment?.voiceName) {
          const voices = externalTtsService.getVoices();
          const voice = voices.find(v => v.name === generalAssignment.voiceName);
          if (voice) {
            voiceId = voice.voice_id;
          }
        }
      }

      // If no user-specific voice, use the default voice ID
      if (!voiceId && this.options.externalTtsVoiceId) {
        voiceId = this.options.externalTtsVoiceId;
      }

      // Speak using external TTS service
      const success = await externalTtsService.speak(item.text, voiceId);

      if (!success) {
        // Fall back to browser TTS if external TTS fails
        console.warn('External TTS failed, falling back to browser TTS');
        await this.processWithBrowserTts(item);
        return;
      }

      // Continue with next item in queue when this one finishes
      // The external TTS service handles this internally
      this.speaking = false;
      void this.processQueue();
    } catch (error) {
      console.error('Error with external TTS:', error);
      // Show notification in status bar instead of toast
      window.dispatchEvent(new CustomEvent('status-notification', {
        detail: {
          type: 'error',
          message: 'External TTS failed, falling back to browser TTS'
        }
      }));

      // Fall back to browser TTS
      await this.processWithBrowserTts(item);
    }
  }

  public stop(): void {
    // Stop browser TTS
    this.synth.cancel();

    // Stop external TTS if enabled
    if (this.options.externalTtsEnabled) {
      externalTtsService.stop();
    }

    // Clear queue and reset state
    this.queue = [];
    this.speaking = false;
  }

  private paused: boolean = false;

  public pause(): void {
    this.paused = true;
    this.synth.pause();
  }

  public resume(): void {
    this.paused = false;
    this.synth.resume();

    // If we're not currently speaking but have items in the queue,
    // start processing the queue again
    if (!this.speaking && this.queue.length > 0) {
      void this.processQueue();
    }
  }

  public isSpeaking(): boolean {
    return this.speaking;
  }

  /**
   * Get the current queue of messages waiting to be spoken
   */
  public getQueue(): SpeechQueueItem[] {
    return [...this.queue];
  }

  /**
   * Skip the current message being spoken
   */
  public skipCurrent(): void {
    this.synth.cancel();
    // The onend event will trigger processQueue() to continue with the next item
  }

  /**
   * Remove a specific item from the queue by its messageId
   */
  public removeFromQueue(messageId: string): boolean {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(item => item.messageId !== messageId);
    return initialLength !== this.queue.length;
  }

  /**
   * Reorder the queue by moving an item to a new position
   */
  public reorderQueue(messageId: string, newPosition: number): boolean {
    if (newPosition < 0 || newPosition >= this.queue.length) return false;

    const itemIndex = this.queue.findIndex(item => item.messageId === messageId);
    if (itemIndex === -1) return false;

    // Remove the item from its current position
    const [item] = this.queue.splice(itemIndex, 1);

    // Insert it at the new position
    this.queue.splice(newPosition, 0, item);

    return true;
  }

  /**
   * Check if a user is a subscriber
   */
  private async isSubscriber(username: string): Promise<boolean> {
    return await twitchUserListService.isSubscriber(username);
  }

  /**
   * Check if a user is a VIP
   */
  private async isVIP(username: string): Promise<boolean> {
    return await twitchUserListService.isVip(username);
  }

  /**
   * Check if a user is a moderator
   */
  private async isModerator(username: string): Promise<boolean> {
    return await twitchUserListService.isModerator(username);
  }
}

// Singleton instance
const speechQueue = new SpeechQueue();
export default speechQueue;
