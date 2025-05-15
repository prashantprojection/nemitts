# Nemitts TTS System - Free SaaS Edition

A free web application that reads Twitch chat messages using text-to-speech (TTS) technology. This version has been modified to be completely free, with all premium features made available to everyone and no subscription or payment required.

## Documentation

- [User Guide](docs/USER_GUIDE.md) - How to use the application
- [Developer Guide](docs/DEVELOPER_GUIDE.md) - Technical details for developers
- [API Documentation](docs/API.md) - API endpoints and usage
- [Configuration Guide](docs/CONFIGURATION.md) - Environment variables and settings
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions

## Features

- Connect to any Twitch channel's chat
- Text-to-speech for chat messages
- Customizable voice settings
- Message filtering options (skip emotes, links, bot messages)
- User-specific voice assignments
- Persistent settings with localStorage
- OBS browser source integration
- Multi-Zone Support for multiple TTS zones
- Keyboard shortcuts for quick actions

## Technologies Used

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- localStorage for data persistence
- Twitch API integration

## Local Development

1. Clone the repository:
   ```sh
   git clone <YOUR_GIT_URL>
   cd <YOUR_PROJECT_NAME>
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Run the development server:
   ```sh
   npm run dev
   ```

4. Open [http://localhost:8080](http://localhost:8080) in your browser.

## Deployment Guide

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- A Twitch Developer Application (for authentication)

### Production Deployment

#### Option 1: Using the Deployment Script

We've included a deployment script to help you deploy the application:

```bash
npm run deploy
```

This will:
- Install dependencies
- Build the project
- Create necessary configuration files for deployment platforms
- Provide instructions for different deployment options

#### Option 2: Manual Deployment to Netlify

1. Build the project:
   ```bash
   npm run build
   ```

2. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

3. Deploy to Netlify:
   ```bash
   npm run deploy:netlify
   ```

#### Option 3: Manual Deployment to Vercel

1. Build the project:
   ```bash
   npm run build
   ```

2. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

3. Deploy to Vercel:
   ```bash
   npm run deploy:vercel
   ```

   Alternatively, you can deploy directly from the Vercel dashboard:
   - Go to [vercel.com](https://vercel.com) and sign up/login
   - Import your GitHub repository
   - Configure the project settings:
     - Framework Preset: Vite
     - Build Command: `npm run build`
     - Output Directory: `dist`
   - Add the environment variables from `vercel.json`
   - Click Deploy

### Important Post-Deployment Steps

After deploying your application, you need to:

1. **Update your Twitch Developer Application**:
   - Go to [Twitch Developer Console](https://dev.twitch.tv/console/apps)
   - Select your application
   - Add your production URL to the "OAuth Redirect URLs" field
   - Example: `https://your-deployed-app.com`

2. **Test the authentication flow**:
   - Visit your deployed application
   - Try logging in with Twitch
   - Ensure you're redirected back to your application after authentication

3. **Verify localStorage integration**:
   - Check that settings are being saved to localStorage
   - Verify that user authentication is working correctly

## Troubleshooting

### Authentication Issues

If you're experiencing authentication issues in production:

1. Check browser console for errors
2. Verify that your Twitch Developer Application has the correct redirect URI
3. Clear browser cookies and local storage, then try again

### Deployment Issues

If you encounter issues during deployment:

1. Check that all environment variables are properly set
2. Verify that the build process completed successfully
3. Check for any CORS issues in the browser console
4. Ensure your Supabase project is properly configured

#### Vercel-Specific Issues

If you see an error about "builds" in your configuration file:

1. Make sure your `vercel.json` file uses the simplified format with `rewrites` instead of `builds` and `routes`
2. If deploying through the Vercel dashboard, you can remove the `vercel.json` file entirely and configure the project settings in the dashboard
3. For SPA routing, ensure you have the proper rewrites configuration to redirect all routes to `index.html`
