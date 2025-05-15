/**
 * React compatibility layer to handle differences between environments
 * This ensures that React hooks work correctly in all environments
 */
import * as React from 'react';

// Use useLayoutEffect in browser environments, useEffect in SSR environments
export const useIsomorphicLayoutEffect = typeof window !== 'undefined'
  ? React.useLayoutEffect
  : React.useEffect;

// Create a safe version of useLayoutEffect that falls back to useEffect if needed
export const safeUseLayoutEffect = (effect: React.EffectCallback, deps?: React.DependencyList) => {
  // In production, we'll use our isomorphic version
  if (process.env.NODE_ENV === 'production') {
    return useIsomorphicLayoutEffect(effect, deps);
  }

  // In development, we can use the regular useLayoutEffect
  return React.useLayoutEffect(effect, deps);
};

// Export other React hooks to ensure they're always available
export const {
  useState,
  useEffect,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useRef,
  useImperativeHandle,
  useDebugValue,
} = React;

// Create a safe React object that can be used in production
export const SafeReact = {
  ...React,
  useLayoutEffect: safeUseLayoutEffect
};

// Export a function to patch React globally if needed
export function patchReactGlobally() {
  if (typeof window !== 'undefined') {
    try {
      // @ts-ignore - Patch React globally to use our safe version
      if (window.React && !window.React.useLayoutEffect) {
        // @ts-ignore
        window.React.useLayoutEffect = useEffect;
      }

      // Handle any other missing React properties
      if (window.React) {
        // @ts-ignore
        if (!window.React.useState) window.React.useState = useState;
        // @ts-ignore
        if (!window.React.useEffect) window.React.useEffect = useEffect;
        // @ts-ignore
        if (!window.React.useContext) window.React.useContext = useContext;
      }
    } catch (e) {
      console.warn('Failed to patch React globally:', e);
    }
  }
}
