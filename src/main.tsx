import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import './index.css';

// Import App lazily to improve initial load time
const App = React.lazy(() => import('./App.tsx'));

// Import error suppression utility and React compatibility layer
import { setupErrorSuppression } from './utils/errorSuppressionUtils';
import { patchReactGlobally } from './utils/reactCompat';

// Set up error suppression in all environments
setupErrorSuppression();

// Patch React globally to handle missing hooks in production
patchReactGlobally();

// Add a global error handler for Twitch extension errors
window.addEventListener('error', (event) => {
  // Check if the error is related to Twitch extensions
  if (event.filename?.includes('multiVariateTestingCS.js') ||
      event.message?.includes('isInitialized') ||
      event.message?.includes('Cannot read properties of undefined')) {
    // Prevent the error from propagating
    event.preventDefault();
    return true;
  }
  return false;
}, true);

// Create a loading component for the initial render
const LoadingFallback = () => (
  <div className="loading">
    <div className="loading-spinner"></div>
  </div>
);

// Wait for the DOM to be fully loaded
const renderApp = () => {
  const root = ReactDOM.createRoot(document.getElementById("root")!);
  root.render(
    <React.StrictMode>
      <React.Suspense fallback={<LoadingFallback />}>
        <App />
      </React.Suspense>
    </React.StrictMode>
  );
};

// Use requestIdleCallback for non-critical rendering if available
if ('requestIdleCallback' in window) {
  window.requestIdleCallback(() => {
    renderApp();
  });
} else {
  // Fallback for browsers that don't support requestIdleCallback
  setTimeout(renderApp, 0);
}
