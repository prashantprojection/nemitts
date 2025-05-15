# Twitch TTS Reader - Advanced Features

This document outlines the advanced features added to the Twitch TTS Reader application.

## Advanced Message Filtering

The application now includes a comprehensive message filtering system that allows you to:

- **Keyword Filtering**: Block or prioritize messages containing specific words
- **User Filtering**: Block or prioritize messages from specific users
- **Regex Pattern Matching**: Create complex filtering rules using regular expressions
- **Message Length Limits**: Skip messages that are too short or too long
- **User Cooldown**: Prevent the same user from having multiple messages read in quick succession

### How to Use Filters

1. Go to the Settings tab and select the "Filters" sub-tab
2. Enable advanced filtering with the toggle switch
3. Configure your filters in the various sections:
   - Keywords: Add words to blacklist (block) or whitelist (prioritize)
   - Users: Add usernames to blacklist, whitelist, or priority list
   - Regex: Create pattern-based filters with optional priority levels
   - Limits: Set message length constraints and user cooldown periods

## User-Specific Voices

You can now assign different voices to specific users, making it easier to distinguish between chatters.

### How to Assign Voices

1. Go to the Settings tab and select the "User Voices" sub-tab
2. Enter a username and select a voice from the dropdown
3. Adjust rate, pitch, and volume settings for that user
4. Click "Add Voice Assignment" to save
5. Test the voice with the "Test Voice" button

## Queue Management

The application now provides a visual queue display and controls for managing TTS messages.

### Queue Features

- View all messages waiting to be spoken
- Skip the currently speaking message
- Remove specific messages from the queue
- Reorder messages by moving them up or down in the queue
- Clear the entire queue at once

## External TTS Integration

The application now supports integration with external TTS services like ElevenLabs for higher quality voices.

### Setting Up External TTS

1. Go to the Settings tab and select the "External TTS" sub-tab
2. Enable external TTS with the toggle switch
3. Enter your API key
4. Click "Save Settings"
5. Test the external TTS with the "Test External TTS" button

## Database Schema Updates

The application now stores additional data in Supabase:

- Filter settings (as JSON)
- User voice assignments (as JSON)
- External TTS settings
- Message queue state

## Technical Implementation

- Advanced filtering logic in `speechQueue.ts`
- User voice assignment handling in `processQueue` method
- Queue management methods for skipping, removing, and reordering messages
- External TTS API integration (placeholder for actual implementation)
- Supabase schema updates to store new settings

## Future Enhancements

Potential future enhancements include:

- Full ElevenLabs API integration with voice selection
- Voice emotion detection and adaptation
- Automatic language detection and translation
- More advanced queue throttling during high chat activity
- Analytics dashboard for TTS usage statistics
