/**
 * Utility to suppress common console errors that are not relevant to the application
 * This is used to clean up the console output for users
 */

/**
 * Set up console error suppression for common third-party errors
 * This prevents errors from 7TV extensions, Twitch blob URLs, etc. from cluttering the console
 */
export function setupErrorSuppression(): void {
  // Store original console methods
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleInfo = console.info;
  const originalConsoleLog = console.log;

  // Patterns to suppress in console output
  const suppressPatterns = [
    '7TV',
    'seventv',
    'blob:https://id.twitch.tv/',
    'net::ERR_FILE_NOT_FOUND',
    'MutationObserver',
    'message port closed',
    'Unchecked runtime.lastError', // Edge extension message port warning
    'multiVariateTestingCS.js', // Suppress errors from missing multiVariateTestingCS.js
    'index-BgS_Lyc3.js', // Suppress errors from missing index-BgS_Lyc3.js
    'Cannot read properties of undefined (reading', // Suppress errors from undefined properties
    'useLayoutEffect', // Suppress React useLayoutEffect errors
    'isInitialized' // Suppress Twitch extension initialization errors
  ];

  // Helper to check if a message contains any of the suppression patterns
  const shouldSuppress = (args: any[]): boolean => {
    if (args.length === 0) return false;

    const messageString = Array.from(args).join(' ');
    return suppressPatterns.some(pattern => messageString.includes(pattern));
  };

  // Override console.error
  console.error = function(...args: any[]) {
    if (shouldSuppress(args)) return;
    originalConsoleError.apply(console, args);
  };

  // Override console.warn
  console.warn = function(...args: any[]) {
    if (shouldSuppress(args)) return;
    originalConsoleWarn.apply(console, args);
  };

  // Override console.info
  console.info = function(...args: any[]) {
    if (shouldSuppress(args)) return;
    originalConsoleInfo.apply(console, args);
  };

  // Override console.log
  console.log = function(...args: any[]) {
    if (shouldSuppress(args)) return;
    originalConsoleLog.apply(console, args);
  };

  // Set up global error handler for blob URL errors
  window.addEventListener('error', function(event) {
    // Specifically check for blob URL errors from Twitch
    if (event.filename && event.filename.startsWith('blob:https://id.twitch.tv/')) {
      event.preventDefault();
      return true;
    }

    // Also suppress other common errors
    if (event.message && (
        event.message.includes('message port closed') ||
        event.message.includes('MutationObserver') ||
        event.message.includes('7TV') ||
        event.message.includes('multiVariateTestingCS.js') ||
        event.message.includes('index-BgS_Lyc3.js') ||
        event.message.includes('Cannot read properties of undefined') ||
        event.message.includes('useLayoutEffect') ||
        event.message.includes('isInitialized'))) {
      event.preventDefault();
      return true;
    }

    // Suppress errors from specific files
    if (event.filename && (
        event.filename.includes('multiVariateTestingCS.js') ||
        event.filename.includes('index-BgS_Lyc3.js'))) {
      event.preventDefault();
      return true;
    }

    return false;
  }, true);
}
