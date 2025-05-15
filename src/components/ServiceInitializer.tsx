import { useEffect } from 'react';
import twitchProfileService from '@/services/twitch/TwitchProfileService';

/**
 * Component that initializes services when the app starts
 * This is a "headless" component that doesn't render anything
 */
const ServiceInitializer = () => {
  useEffect(() => {
    console.log('[ServiceInitializer] Initializing services...');

    // Initialize TwitchProfileService
    twitchProfileService.initialize();

    // Add other service initializations here

    return () => {
      // Clean up services if needed
      console.log('[ServiceInitializer] Cleaning up services...');
    };
  }, []);

  // This component doesn't render anything
  return null;
};

export default ServiceInitializer;
