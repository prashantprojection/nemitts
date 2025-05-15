# User Guide

## Getting Started

Welcome to the Twitch TTS Reader! This application allows you to have Twitch chat messages read aloud using text-to-speech technology.

### Basic Setup

1. **Connect to Twitch**: Click the "Connect with Twitch" button to authorize the application.
2. **Enter Channel Name**: Type the name of the Twitch channel you want to monitor in the input field.
3. **Start Listening**: Click "Connect" to start listening to chat messages.

## Features

### Voice Settings

- **General Voice**: Select a default voice that will be used for all messages without specific voice assignments.
- **Voice Rate**: Adjust how fast or slow the text is read.
- **Voice Pitch**: Adjust the pitch of the voice.
- **Voice Volume**: Control the volume of the text-to-speech output.

### Message Filters

- **Skip Emotes**: When enabled, emotes in messages will not be read aloud.
- **Skip Links**: When enabled, URLs in messages will not be read aloud.
- **Skip Bot Messages**: When enabled, messages from known bot accounts will be ignored.
- **Say Usernames**: When enabled, the username of the message sender will be read before their message.

### User Voice Assignments

You can assign specific voices to individual users:

1. Click on "User Voice Assignments" in the settings.
2. Enter a Twitch username.
3. Select a voice from the dropdown menu.
4. Click "Save" to apply the assignment.

## Using with OBS

To add the TTS Reader to your stream:

1. In OBS, add a new "Browser" source.
2. Enter the URL of your deployed TTS Reader application.
3. Set the width and height to match your needs.
4. Click "OK" to add the source.

## Keyboard Shortcuts

- **Space**: Pause/Resume TTS
- **Esc**: Stop current TTS and clear queue
- **Up/Down Arrows**: Adjust volume
- **Left/Right Arrows**: Navigate through voice options

## Troubleshooting

If you encounter issues:

- Make sure you're logged in with Twitch
- Check that you've entered the correct channel name
- Verify that your browser allows audio playback
- Try refreshing the page if TTS stops working

For more detailed troubleshooting, see the [Troubleshooting Guide](TROUBLESHOOTING.md).
