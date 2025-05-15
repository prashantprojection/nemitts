import * as React from 'react';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import KeyboardShortcutOverlay from '@/components/KeyboardShortcutOverlay';

export interface HotkeyInfo {
  shortcut: string;
  description: string;
  category?: string;
  callback: (e: KeyboardEvent) => void;
}

interface KeyboardShortcutContextType {
  registerShortcut: (shortcut: HotkeyInfo) => void;
  unregisterShortcut: (shortcut: string) => void;
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;
  showOverlay: () => void;
  hideOverlay: () => void;
  shortcuts: HotkeyInfo[];
}

const KeyboardShortcutContext = createContext<KeyboardShortcutContextType | undefined>(undefined);

export const useKeyboardShortcuts = () => {
  const context = useContext(KeyboardShortcutContext);
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within a KeyboardShortcutProvider');
  }
  return context;
};

interface KeyboardShortcutProviderProps {
  children: ReactNode;
}

export const KeyboardShortcutProvider: React.FC<KeyboardShortcutProviderProps> = ({ children }) => {
  const [shortcuts, setShortcuts] = useState<HotkeyInfo[]>([]);
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('hotkeys-enabled') === 'true';
    } catch (error) {
      console.error('Error loading hotkeys settings:', error);
      return false;
    }
  });
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  // Register a new shortcut
  const registerShortcut = (shortcut: HotkeyInfo) => {
    setShortcuts(prev => {
      // Check if shortcut already exists
      const exists = prev.some(s => s.shortcut === shortcut.shortcut && s.description === shortcut.description);
      if (exists) return prev;
      return [...prev, shortcut];
    });
  };

  // Unregister a shortcut
  const unregisterShortcut = (shortcutDesc: string) => {
    setShortcuts(prev => prev.filter(s => s.description !== shortcutDesc));
  };

  // Show the shortcut overlay
  const showOverlay = () => {
    setIsOverlayOpen(true);
  };

  // Hide the shortcut overlay
  const hideOverlay = () => {
    setIsOverlayOpen(false);
  };

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show overlay when user presses "?" with shift
      if (e.key === "?" && e.shiftKey && isEnabled) {
        e.preventDefault();
        showOverlay();
        return;
      }

      // Don't process other shortcuts if disabled
      if (!isEnabled) return;

      // Don't trigger shortcuts when typing in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // Check for matching shortcuts
      for (const shortcut of shortcuts) {
        const keys = shortcut.shortcut.toLowerCase().split('+');
        const hasCtrl = keys.includes('ctrl');
        const hasAlt = keys.includes('alt');
        const hasShift = keys.includes('shift');
        const mainKey = keys.filter(k => !['ctrl', 'alt', 'shift'].includes(k))[0];

        if (
          e.key.toLowerCase() === mainKey &&
          !!e.ctrlKey === hasCtrl &&
          !!e.altKey === hasAlt &&
          !!e.shiftKey === hasShift
        ) {
          e.preventDefault();
          console.log(`Executing shortcut: ${shortcut.description}`);
          shortcut.callback(e);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts, isEnabled]);

  // Save enabled state to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('hotkeys-enabled', isEnabled.toString());
    } catch (error) {
      console.error('Error saving hotkeys settings:', error);
    }
  }, [isEnabled]);

  return (
    <KeyboardShortcutContext.Provider
      value={{
        registerShortcut,
        unregisterShortcut,
        isEnabled,
        setIsEnabled,
        showOverlay,
        hideOverlay,
        shortcuts
      }}
    >
      {children}
      <KeyboardShortcutOverlay
        hotkeys={shortcuts.map(s => ({
          shortcut: s.shortcut,
          description: s.description,
          category: s.category
        }))}
        isOpen={isOverlayOpen}
        onClose={hideOverlay}
      />
    </KeyboardShortcutContext.Provider>
  );
};
