import { useSettings } from '@/contexts/SettingsContext';

/**
 * A hook for using filter settings from the settings context
 *
 * @returns Filter settings and functions to update them
 */
export function useFilterSettingsContext() {
  const {
    filterSettings,
    updateFilterSetting,
    saveFilterSettings,
    resetFilterSettings,
    isLoading,
    isSaving
  } = useSettings();

  // Update a list setting (e.g., blacklistedWords)
  const updateListSetting = <K extends 'priorityUsers' | 'blacklistedWords' | 'blacklistedUsers' | 'specificUsersList'>(
    key: K,
    value: string[]
  ) => {
    updateFilterSetting(key, value);
  };

  // Add an item to a list setting
  const addToListSetting = <K extends 'priorityUsers' | 'blacklistedWords' | 'blacklistedUsers' | 'specificUsersList'>(
    key: K,
    item: string
  ) => {
    if (!item.trim()) return;

    // Make sure we have a valid array to work with
    const currentList = Array.isArray(filterSettings[key]) ? [...filterSettings[key]] : [];

    // Check if the item already exists (case insensitive for words)
    const itemExists = key.includes('Words')
      ? currentList.some(existing => existing.toLowerCase() === item.toLowerCase())
      : currentList.includes(item);

    if (!itemExists) {
      console.log(`Adding ${item} to ${key}`, [...currentList, item]);
      updateFilterSetting(key, [...currentList, item]);
    }
  };

  // Remove an item from a list setting
  const removeFromListSetting = <K extends 'priorityUsers' | 'blacklistedWords' | 'blacklistedUsers' | 'specificUsersList'>(
    key: K,
    item: string
  ) => {
    // Make sure we have a valid array to work with
    if (!filterSettings[key] || !Array.isArray(filterSettings[key])) {
      console.warn(`Cannot remove from ${key} because it is not an array`);
      return;
    }

    const currentList = [...filterSettings[key]];

    // For words, we need to do case-insensitive comparison
    if (key.includes('Words')) {
      // Find the exact item in the case-insensitive match
      const exactItem = currentList.find(i => i.toLowerCase() === item.toLowerCase());
      if (exactItem) {
        const newList = currentList.filter(i => i !== exactItem);
        console.log(`Removing ${item} from ${key}`, newList);
        updateFilterSetting(key, newList);
      } else {
        console.warn(`Item ${item} not found in ${key}`);
      }
    } else {
      // For users, do exact match
      if (currentList.includes(item)) {
        const newList = currentList.filter(i => i !== item);
        console.log(`Removing ${item} from ${key}`, newList);
        updateFilterSetting(key, newList);
      } else {
        console.warn(`Item ${item} not found in ${key}`);
      }
    }
  };

  // Regex filter functions removed

  // Add a nickname
  const addNickname = (username: string, nickname: string) => {
    if (!username.trim() || !nickname.trim()) return;

    const currentNicknames = Array.isArray(filterSettings.userNicknames) ? [...filterSettings.userNicknames] : [];

    // Check if this username already has a nickname
    const existingIndex = currentNicknames.findIndex(
      entry => entry.username.toLowerCase() === username.toLowerCase()
    );

    if (existingIndex >= 0) {
      // Update existing nickname
      currentNicknames[existingIndex] = { username, nickname };
    } else {
      // Add new nickname
      currentNicknames.push({ username, nickname });
    }

    updateFilterSetting('userNicknames', currentNicknames);
  };

  // Remove a nickname
  const removeNickname = (username: string) => {
    if (!username.trim()) return;

    const currentNicknames = Array.isArray(filterSettings.userNicknames) ? [...filterSettings.userNicknames] : [];

    const newNicknames = currentNicknames.filter(
      entry => entry.username.toLowerCase() !== username.toLowerCase()
    );

    updateFilterSetting('userNicknames', newNicknames);
  };

  // Add a word replacement
  const addWordReplacement = (pattern: string, replacement: string, caseSensitive: boolean, wholeWord: boolean) => {
    if (!pattern.trim()) return;

    const currentReplacements = Array.isArray(filterSettings.wordReplacements) ? [...filterSettings.wordReplacements] : [];

    currentReplacements.push({
      pattern,
      replacement,
      caseSensitive,
      wholeWord
    });

    updateFilterSetting('wordReplacements', currentReplacements);
  };

  // Remove a word replacement
  const removeWordReplacement = (index: number) => {
    const currentReplacements = Array.isArray(filterSettings.wordReplacements) ? [...filterSettings.wordReplacements] : [];

    if (index >= 0 && index < currentReplacements.length) {
      currentReplacements.splice(index, 1);
      updateFilterSetting('wordReplacements', currentReplacements);
    }
  };

  // Update a word replacement
  const updateWordReplacement = (index: number, pattern: string, replacement: string, caseSensitive: boolean, wholeWord: boolean) => {
    const currentReplacements = Array.isArray(filterSettings.wordReplacements) ? [...filterSettings.wordReplacements] : [];

    if (index >= 0 && index < currentReplacements.length) {
      currentReplacements[index] = {
        pattern,
        replacement,
        caseSensitive,
        wholeWord
      };

      updateFilterSetting('wordReplacements', currentReplacements);
    }
  };

  return {
    settings: filterSettings,
    updateSetting: updateFilterSetting,
    updateListSetting,
    addToListSetting,
    removeFromListSetting,
    // Regex filter functions removed
    addNickname,
    removeNickname,
    addWordReplacement,
    removeWordReplacement,
    updateWordReplacement,
    saveSettings: saveFilterSettings,
    // resetToDefaults removed to prevent accidental reset of blocklists
    isLoading,
    isSaving
  };
}
