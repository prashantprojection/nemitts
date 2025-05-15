# Developer Guide

This guide provides technical information for developers who want to contribute to or modify the Twitch TTS Reader application.

## Project Structure

```
/
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   ├── contexts/        # React context providers
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility functions and services
│   ├── pages/           # Page components
│   ├── services/        # Service modules (TTS, Twitch, etc.)
│   ├── styles/          # Global styles
│   ├── types/           # TypeScript type definitions
│   ├── App.tsx          # Main application component
│   └── main.tsx         # Application entry point
├── .env.example         # Example environment variables
├── package.json         # Project dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── vite.config.ts       # Vite configuration
```

## Key Components

### TTS Service

The TTS service (`src/services/SpeechService.ts`) handles text-to-speech functionality:

- Voice selection and configuration
- Message queue management
- Speech synthesis using the Web Speech API

### Twitch Integration

Twitch integration (`src/services/TwitchService.ts`) manages:

- Authentication with Twitch
- Connecting to chat channels
- Parsing and filtering messages

### Settings Management

Settings are managed through:

- Local storage for immediate access
- Supabase for persistent storage across devices

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- A Twitch Developer Application
- A Supabase project

### Environment Variables

Create a `.env` file with the following variables:

```
VITE_TWITCH_CLIENT_ID=your_twitch_client_id
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Development Workflow

1. Make changes to the codebase
2. Run tests: `npm test`
3. Start the development server: `npm run dev`
4. Build for production: `npm run build`

## Adding New Features

### Adding a New Voice Provider

1. Create a new service in `src/services/`
2. Implement the required interface methods
3. Register the service in the voice provider factory
4. Add UI controls in the settings component

### Adding New Message Filters

1. Add the filter option in the settings state
2. Implement the filtering logic in the message processing pipeline
3. Update the UI to include the new filter option

## Testing

- Unit tests: `npm run test:unit`
- Integration tests: `npm run test:integration`
- E2E tests: `npm run test:e2e`

## Deployment

See the [Configuration Guide](CONFIGURATION.md) for detailed deployment instructions.
