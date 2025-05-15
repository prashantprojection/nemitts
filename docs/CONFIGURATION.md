# Configuration Guide

This guide explains how to configure the Twitch TTS Reader application for development and production environments.

## Environment Variables

The application uses environment variables for configuration. Create a `.env` file in the root directory with the following variables:

### Required Variables

```
# Twitch API Configuration
VITE_TWITCH_CLIENT_ID=your_twitch_client_id
VITE_TWITCH_REDIRECT_URI=http://localhost:8080/auth/callback

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Optional Variables

```
# Application Configuration
VITE_APP_NAME=Twitch TTS Reader
VITE_APP_DESCRIPTION=A web application that reads Twitch chat messages using text-to-speech technology

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_PREMIUM_FEATURES=false

# Deployment Configuration
VITE_PUBLIC_URL=https://your-app-url.com
```

## Twitch Developer Application Setup

1. Go to the [Twitch Developer Console](https://dev.twitch.tv/console/apps)
2. Create a new application
3. Set the OAuth Redirect URL to match your `VITE_TWITCH_REDIRECT_URI`
4. Copy the Client ID to your `.env` file

## Supabase Setup

1. Create a new project on [Supabase](https://supabase.com)
2. Copy the URL and anon key to your `.env` file
3. Set up the database schema:

```sql
-- Create tables
CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY,
  default_voice TEXT,
  rate FLOAT,
  pitch FLOAT,
  volume FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_voice_assignments (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES user_settings(user_id),
  twitch_username TEXT NOT NULL,
  voice TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, twitch_username)
);

CREATE TABLE filter_settings (
  user_id TEXT PRIMARY KEY REFERENCES user_settings(user_id),
  skip_emotes BOOLEAN DEFAULT true,
  skip_links BOOLEAN DEFAULT true,
  skip_bots BOOLEAN DEFAULT true,
  say_usernames BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_voice_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE filter_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Similar policies for other tables...
```

## Deployment Configuration

### Vercel

Create a `vercel.json` file in the root directory:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "env": {
    "VITE_TWITCH_CLIENT_ID": "@twitch_client_id",
    "VITE_SUPABASE_URL": "@supabase_url",
    "VITE_SUPABASE_ANON_KEY": "@supabase_anon_key"
  }
}
```

### Netlify

Create a `netlify.toml` file in the root directory:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  VITE_TWITCH_CLIENT_ID = "your_twitch_client_id"
  VITE_SUPABASE_URL = "your_supabase_url"
  VITE_SUPABASE_ANON_KEY = "your_supabase_anon_key"
```

## Advanced Configuration

### Custom Voice Providers

To add a custom voice provider, create a configuration file at `src/config/voiceProviders.ts`:

```typescript
export const voiceProviders = {
  webSpeech: {
    enabled: true,
    default: true
  },
  amazonPolly: {
    enabled: false,
    apiKey: process.env.VITE_AMAZON_POLLY_API_KEY,
    region: process.env.VITE_AMAZON_POLLY_REGION
  },
  googleTTS: {
    enabled: false,
    apiKey: process.env.VITE_GOOGLE_TTS_API_KEY
  }
};
```

### Performance Tuning

For high-traffic channels, you can adjust these settings in `src/config/performance.ts`:

```typescript
export const performanceConfig = {
  maxQueueSize: 50,
  messageRateLimit: 10, // messages per second
  messageDebounceMs: 300,
  useWorker: true,
  cacheVoices: true
};
```

## Security Considerations

- Always use environment variables for sensitive information
- Set up proper CORS headers in production
- Implement rate limiting for API endpoints
- Use HTTPS in production
- Keep dependencies updated
