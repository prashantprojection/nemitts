/**
 * Utility functions for debugging authentication and session issues
 * These functions help with debugging authentication and other issues
 */

// Enable debug mode only in development
const DEBUG_ENABLED = process.env.NODE_ENV === 'development';

// List of all known auth-related storage keys
const AUTH_STORAGE_KEYS = [
  'twitch-tts-auth-state',
  'twitch-auth-token',
  'twitch-auth-data',
  'twitch-auth-state',
  'twitch-redirect-uri',
  'twitch-tts-auth-state-token'
];

/**
 * Log a debug message to the console
 * @param message The message to log
 * @param data Optional data to log
 */
export const debugLog = (message: string, data?: any): void => {
  if (!DEBUG_ENABLED) return;

  if (data) {
    console.log(`[DEBUG] ${message}`, data);
  } else {
    console.log(`[DEBUG] ${message}`);
  }
};

/**
 * Check and log the current authentication state in all storage mechanisms
 */
export const debugAuthState = (): void => {
  if (!DEBUG_ENABLED) return;

  try {
    // Check localStorage using the predefined keys
    const localStorageKeys = AUTH_STORAGE_KEYS;

    console.log('=== DEBUG: Authentication State ===');
    console.log('--- localStorage ---');
    localStorageKeys.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        console.log(`${key}: ${value ? 'PRESENT' : 'MISSING'}`);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            console.log(`  Value: `, parsed);
          } catch (e) {
            console.log(`  Value: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
          }
        }
      } catch (e) {
        console.log(`${key}: ERROR - ${e.message}`);
      }
    });

    // Check sessionStorage
    console.log('--- sessionStorage ---');
    localStorageKeys.forEach(key => {
      try {
        const value = sessionStorage.getItem(key);
        console.log(`${key}: ${value ? 'PRESENT' : 'MISSING'}`);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            console.log(`  Value: `, parsed);
          } catch (e) {
            console.log(`  Value: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
          }
        }
      } catch (e) {
        console.log(`${key}: ERROR - ${e.message}`);
      }
    });

    // Check cookies
    console.log('--- cookies ---');
    const cookies = document.cookie.split(';');
    if (cookies.length === 1 && cookies[0] === '') {
      console.log('No cookies found');
    } else {
      cookies.forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        console.log(`${name}: PRESENT`);
        if (value) {
          try {
            const decodedValue = decodeURIComponent(value);
            try {
              const parsed = JSON.parse(decodedValue);
              console.log(`  Value: `, parsed);
            } catch (e) {
              console.log(`  Value: ${decodedValue.substring(0, 50)}${decodedValue.length > 50 ? '...' : ''}`);
            }
          } catch (e) {
            console.log(`  Value: [Error decoding]`);
          }
        }
      });
    }

    console.log('=== END DEBUG ===');
  } catch (e) {
    console.error('Error in debugAuthState:', e);
  }
};

/**
 * Check if the browser supports the storage mechanisms we're using
 */
export const checkStorageSupport = (): void => {
  if (!DEBUG_ENABLED) return;

  console.log('=== DEBUG: Storage Support ===');

  // Check localStorage
  try {
    localStorage.setItem('storage-test', 'test');
    const value = localStorage.getItem('storage-test');
    localStorage.removeItem('storage-test');
    console.log(`localStorage: ${value === 'test' ? 'SUPPORTED' : 'NOT WORKING CORRECTLY'}`);
  } catch (e) {
    console.log(`localStorage: NOT SUPPORTED - ${e.message}`);
  }

  // Check sessionStorage
  try {
    sessionStorage.setItem('storage-test', 'test');
    const value = sessionStorage.getItem('storage-test');
    sessionStorage.removeItem('storage-test');
    console.log(`sessionStorage: ${value === 'test' ? 'SUPPORTED' : 'NOT WORKING CORRECTLY'}`);
  } catch (e) {
    console.log(`sessionStorage: NOT SUPPORTED - ${e.message}`);
  }

  // Check cookies
  try {
    document.cookie = 'storage-test=test;path=/;max-age=60';
    const hasCookie = document.cookie.includes('storage-test=test');
    document.cookie = 'storage-test=;path=/;expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    console.log(`cookies: ${hasCookie ? 'SUPPORTED' : 'NOT WORKING CORRECTLY'}`);
  } catch (e) {
    console.log(`cookies: NOT SUPPORTED - ${e.message}`);
  }

  console.log('=== END DEBUG ===');
};

/**
 * Clear all authentication data from all storage mechanisms
 * This is useful for testing authentication flows
 */
export const clearAllAuthData = (): void => {
  debugLog('Clearing all auth data');

  // Clear localStorage
  try {
    AUTH_STORAGE_KEYS.forEach(key => {
      try {
        localStorage.removeItem(key);
        debugLog(`Removed ${key} from localStorage`);
      } catch (e) {
        debugLog(`Error removing ${key} from localStorage`, e);
      }
    });
  } catch (e) {
    debugLog('Error clearing localStorage', e);
  }

  // Clear sessionStorage
  try {
    AUTH_STORAGE_KEYS.forEach(key => {
      try {
        sessionStorage.removeItem(key);
        debugLog(`Removed ${key} from sessionStorage`);
      } catch (e) {
        debugLog(`Error removing ${key} from sessionStorage`, e);
      }
    });
  } catch (e) {
    debugLog('Error clearing sessionStorage', e);
  }

  // Clear cookies
  try {
    AUTH_STORAGE_KEYS.forEach(key => {
      try {
        document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        debugLog(`Removed ${key} cookie`);
      } catch (e) {
        debugLog(`Error removing ${key} cookie`, e);
      }
    });

    // Also clear specific token cookies
    document.cookie = `twitch-tts-auth-state-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `twitch-auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  } catch (e) {
    debugLog('Error clearing cookies', e);
  }

  debugLog('All auth data cleared');
  debugAuthState(); // Show the current state after clearing
};
