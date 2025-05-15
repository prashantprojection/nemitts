import { useEffect } from 'react';

type HotkeyCallback = (e: KeyboardEvent) => void;

interface HotkeyConfig {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  callback: HotkeyCallback;
  description?: string;
  category?: string;
}

/**
 * Helper function to get a display-friendly string for a hotkey
 */
const getShortcutDisplay = (hotkey: HotkeyConfig): string => {
  const modifiers = [
    hotkey.ctrlKey ? 'Ctrl' : '',
    hotkey.altKey ? 'Alt' : '',
    hotkey.shiftKey ? 'Shift' : '',
  ].filter(Boolean).join('+');

  const keyDisplay = hotkey.key.length === 1
    ? hotkey.key.toUpperCase()
    : hotkey.key;

  return modifiers
    ? `${modifiers}+${keyDisplay}`
    : keyDisplay;
};

/**
 * Hook to register global keyboard shortcuts
 */
export const useHotkeys = (hotkeys: HotkeyConfig[]) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger hotkeys when typing in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      for (const hotkey of hotkeys) {
        if (
          e.key.toLowerCase() === hotkey.key.toLowerCase() &&
          !!e.ctrlKey === !!hotkey.ctrlKey &&
          !!e.altKey === !!hotkey.altKey &&
          !!e.shiftKey === !!hotkey.shiftKey
        ) {
          e.preventDefault();

          // Just log the shortcut usage to avoid any UI issues
          const shortcutDisplay = getShortcutDisplay(hotkey);
          const description = hotkey.description || 'No description';
          console.log(`Shortcut used: ${description} (${shortcutDisplay})`);

          // No toast notifications to avoid potential rendering issues

          hotkey.callback(e);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hotkeys]);

  // Return a list of active hotkeys for documentation
  const getHotkeysList = () => {
    return hotkeys.map(hotkey => {
      return {
        shortcut: getShortcutDisplay(hotkey),
        description: hotkey.description || 'No description',
        category: hotkey.category || 'general'
      };
    });
  };

  return { getHotkeysList };
};
