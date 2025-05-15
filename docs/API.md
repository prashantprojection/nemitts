# API Documentation

This document describes the API endpoints and integration options for the Twitch TTS Reader application.

## REST API

The application provides a REST API for integration with other services.

### Authentication

All API requests require authentication using a JWT token:

```
Authorization: Bearer <your_token>
```

To obtain a token, use the authentication endpoint:

```
POST /api/auth
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}
```

### Endpoints

#### Get Voice Settings

```
GET /api/settings/voice
```

Response:
```json
{
  "defaultVoice": "en-US-Standard-B",
  "rate": 1.0,
  "pitch": 1.0,
  "volume": 0.8
}
```

#### Update Voice Settings

```
PUT /api/settings/voice
Content-Type: application/json

{
  "defaultVoice": "en-US-Standard-D",
  "rate": 1.2,
  "pitch": 1.0,
  "volume": 0.9
}
```

#### Get User Voice Assignments

```
GET /api/settings/user-voices
```

Response:
```json
{
  "assignments": [
    {
      "username": "user1",
      "voice": "en-US-Standard-A"
    },
    {
      "username": "user2",
      "voice": "en-US-Standard-B"
    }
  ]
}
```

#### Add User Voice Assignment

```
POST /api/settings/user-voices
Content-Type: application/json

{
  "username": "user3",
  "voice": "en-US-Standard-C"
}
```

#### Get Filter Settings

```
GET /api/settings/filters
```

Response:
```json
{
  "skipEmotes": true,
  "skipLinks": true,
  "skipBots": true,
  "sayUsernames": true
}
```

#### Update Filter Settings

```
PUT /api/settings/filters
Content-Type: application/json

{
  "skipEmotes": false,
  "skipLinks": true,
  "skipBots": true,
  "sayUsernames": false
}
```

## WebSocket API

The application also provides a WebSocket API for real-time communication.

### Connection

Connect to the WebSocket endpoint:

```
ws://your-app-url/ws
```

Include your authentication token as a query parameter:

```
ws://your-app-url/ws?token=your_token
```

### Events

#### Message Received

When a new chat message is received:

```json
{
  "type": "message",
  "data": {
    "username": "user1",
    "message": "Hello world!",
    "timestamp": "2023-04-17T12:34:56Z"
  }
}
```

#### TTS Status

When TTS status changes:

```json
{
  "type": "tts_status",
  "data": {
    "status": "speaking",
    "message": "Currently reading message from user1"
  }
}
```

### Commands

You can send commands to the WebSocket:

#### Pause TTS

```json
{
  "command": "pause_tts"
}
```

#### Resume TTS

```json
{
  "command": "resume_tts"
}
```

#### Skip Current Message

```json
{
  "command": "skip_message"
}
```

## Integration Examples

### OBS Browser Source

```html
<iframe 
  src="https://your-app-url?channel=channelname&autoconnect=true" 
  width="100%" 
  height="100%" 
  frameborder="0"
></iframe>
```

### Stream Deck Plugin

The application supports integration with Stream Deck through a custom plugin. See the [Stream Deck Plugin Repository](https://github.com/your-username/streamdeck-tts-plugin) for installation and usage instructions.
