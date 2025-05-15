# Troubleshooting Guide

This guide helps you troubleshoot common issues with the Twitch TTS Reader application.

## Authentication Issues

### Cannot Connect to Twitch

**Symptoms:**
- "Failed to connect" error message
- Redirect loop after Twitch login
- Authentication popup closes without completing

**Solutions:**
1. Check that your Twitch Developer Application has the correct redirect URI
2. Ensure your browser allows third-party cookies
3. Clear browser cache and cookies
4. Try using a different browser
5. Check browser console for specific error messages

### Token Refresh Issues

**Symptoms:**
- Automatically logged out after some time
- "Token expired" error messages

**Solutions:**
1. Check that your application is properly handling token refresh
2. Verify that your Twitch Developer Application settings are correct
3. Try logging out and logging back in
4. Check browser console for specific error messages

## TTS Functionality Issues

### No Sound Playing

**Symptoms:**
- Messages appear in the chat log but no sound plays
- TTS queue shows messages but they're not being read

**Solutions:**
1. Check that your browser's volume is not muted
2. Ensure you've granted microphone/audio permissions to the site
3. Try a different browser
4. Check if any browser extensions might be blocking audio
5. Verify that your selected voice is available on your system

### Voice Selection Not Working

**Symptoms:**
- Voice settings don't save
- Voice always reverts to default
- Selected voice doesn't match what you hear

**Solutions:**
1. Check that your browser supports the selected voice
2. Try selecting a different voice
3. Clear browser cache and local storage
4. Check browser console for errors related to speech synthesis
5. Verify that settings are being saved to Supabase correctly

### Messages Not Being Read

**Symptoms:**
- Chat messages appear but aren't read aloud
- Some messages are read while others are skipped

**Solutions:**
1. Check your filter settings (Skip Emotes, Skip Links, Skip Bots)
2. Verify that the message isn't being filtered by your settings
3. Check if the message queue is full
4. Try increasing the queue size in settings
5. Check browser console for errors

## Connection Issues

### Cannot Connect to Chat

**Symptoms:**
- "Failed to connect to chat" error
- No messages appearing in the chat log

**Solutions:**
1. Verify that you've entered the correct channel name
2. Check that you're properly authenticated with Twitch
3. Ensure the channel is currently live or has chat enabled for offline mode
4. Try reconnecting after a few minutes
5. Check your internet connection

### Frequent Disconnections

**Symptoms:**
- Chat connection drops frequently
- "Reconnecting..." message appears often

**Solutions:**
1. Check your internet connection stability
2. Try a different network if possible
3. Reduce the number of browser tabs and applications running
4. Check if your IP might be rate-limited by Twitch
5. Try using a VPN (as a last resort)

## Performance Issues

### High CPU Usage

**Symptoms:**
- Browser becomes slow or unresponsive
- Fan noise increases when using the application
- High CPU usage reported in Task Manager/Activity Monitor

**Solutions:**
1. Reduce the message queue size in settings
2. Close other browser tabs and applications
3. Try a different browser
4. Disable any unnecessary browser extensions
5. Check if your device meets the minimum requirements

### Memory Leaks

**Symptoms:**
- Application becomes slower over time
- Browser memory usage increases continuously
- Browser tab crashes after extended use

**Solutions:**
1. Refresh the page periodically
2. Check browser console for memory-related warnings
3. Try a different browser
4. Update your browser to the latest version
5. Report the issue with detailed steps to reproduce

## Browser Compatibility Issues

### Features Not Working in Specific Browsers

**Symptoms:**
- Application works in one browser but not another
- Specific features fail in certain browsers

**Solutions:**
1. Try using a modern browser (Chrome, Firefox, Edge)
2. Update your browser to the latest version
3. Check browser console for specific error messages
4. Disable browser extensions that might interfere
5. Check if your browser supports the Web Speech API

## Supabase Integration Issues

### Settings Not Saving

**Symptoms:**
- Settings reset after page refresh
- Changes don't persist between sessions

**Solutions:**
1. Verify that you're properly authenticated
2. Check browser console for Supabase-related errors
3. Ensure your Supabase project is active and accessible
4. Check network tab for failed API requests
5. Verify that your Supabase tables have the correct schema

### Data Synchronization Issues

**Symptoms:**
- Settings appear different across devices
- Changes on one device don't appear on another

**Solutions:**
1. Ensure you're logged in with the same account on all devices
2. Check for network connectivity issues
3. Try manually refreshing the page
4. Clear browser cache and local storage
5. Check browser console for synchronization errors

## Reporting Issues

If you've tried the solutions above and still have issues:

1. Check the [GitHub Issues](https://github.com/your-username/twitch-tts-reader/issues) to see if your problem has been reported
2. Create a new issue with:
   - Detailed description of the problem
   - Steps to reproduce
   - Browser and OS information
   - Screenshots or videos if applicable
   - Browser console logs

## Contact Support

For urgent issues or if you need personalized support:

- Email: support@your-app-domain.com
- Discord: [Join our support server](https://discord.gg/your-discord-invite)
- Twitter: [@YourAppHandle](https://twitter.com/YourAppHandle)
