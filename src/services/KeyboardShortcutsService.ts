/**
 * Service for managing keyboard shortcuts in a web application
 * 
 * This service handles:
 * 1. Registering global and context-specific shortcuts
 * 2. Preventing conflicts with browser shortcuts
 * 3. Handling focus-aware shortcuts (only active when not in input fields)
 * 4. Persisting shortcut preferences
 */

export interface KeyboardShortcut {
  id: string;
  description: string;
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  category: string;
  disabled?: boolean;
  focusAware?: boolean; // If true, shortcut only works when not in input fields
  global?: boolean; // If true, works across the entire app
  context?: string; // Context in which this shortcut is active
  custom?: boolean; // If true, this is a user-defined shortcut
}

export interface KeyboardShortcutCategory {
  id: string;
  name: string;
  description?: string;
}

class KeyboardShortcutsService {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private categories: Map<string, KeyboardShortcutCategory> = new Map();
  private activeContext: string = 'global';
  private enabled: boolean = false;

  constructor() {
    // Define default categories
    this.categories.set('general', { id: 'general', name: 'General' });
    this.categories.set('tts', { id: 'tts', name: 'Text-to-Speech' });
    this.categories.set('chat', { id: 'chat', name: 'Chat' });
    this.categories.set('navigation', { id: 'navigation', name: 'Navigation' });
  }

  /**
   * Initialize the keyboard shortcuts service
   */
  public init(): void {
    // Load user preferences
    this.loadShortcuts();
    
    // Add event listener for keyboard events
    document.addEventListener('keydown', this.handleKeyDown);
    
    this.enabled = true;
  }

  /**
   * Clean up the keyboard shortcuts service
   */
  public destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.enabled = false;
  }

  /**
   * Handle keyboard events
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled) return;
    
    // Don't trigger shortcuts when typing in input fields, textareas, etc.
    const target = event.target as HTMLElement;
    const isInputField = target.tagName === 'INPUT' || 
                         target.tagName === 'TEXTAREA' || 
                         target.isContentEditable;
    
    // Find matching shortcuts
    for (const shortcut of this.shortcuts.values()) {
      // Skip disabled shortcuts
      if (shortcut.disabled) continue;
      
      // Skip context-specific shortcuts if not in the right context
      if (shortcut.context && shortcut.context !== this.activeContext && !shortcut.global) continue;
      
      // Skip focus-aware shortcuts when in input fields
      if (shortcut.focusAware && isInputField) continue;
      
      // Check if the key combination matches
      if (this.matchesShortcut(event, shortcut)) {
        // Prevent default browser behavior for this key combination
        event.preventDefault();
        
        // Execute the shortcut action
        shortcut.action();
        
        // Break after the first matching shortcut
        break;
      }
    }
  };

  /**
   * Check if a keyboard event matches a shortcut
   */
  private matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
    return event.key.toLowerCase() === shortcut.key.toLowerCase() &&
           !!event.ctrlKey === !!shortcut.ctrlKey &&
           !!event.altKey === !!shortcut.altKey &&
           !!event.shiftKey === !!shortcut.shiftKey &&
           !!event.metaKey === !!shortcut.metaKey;
  }

  /**
   * Register a new keyboard shortcut
   */
  public registerShortcut(shortcut: KeyboardShortcut): void {
    this.shortcuts.set(shortcut.id, shortcut);
  }

  /**
   * Register multiple shortcuts at once
   */
  public registerShortcuts(shortcuts: KeyboardShortcut[]): void {
    shortcuts.forEach(shortcut => this.registerShortcut(shortcut));
  }

  /**
   * Unregister a keyboard shortcut
   */
  public unregisterShortcut(id: string): void {
    this.shortcuts.delete(id);
  }

  /**
   * Get all registered shortcuts
   */
  public getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcuts for a specific category
   */
  public getShortcutsByCategory(categoryId: string): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values())
      .filter(shortcut => shortcut.category === categoryId);
  }

  /**
   * Get shortcuts for the current context
   */
  public getContextShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values())
      .filter(shortcut => shortcut.global || !shortcut.context || shortcut.context === this.activeContext);
  }

  /**
   * Set the active context
   */
  public setContext(context: string): void {
    this.activeContext = context;
  }

  /**
   * Get the active context
   */
  public getContext(): string {
    return this.activeContext;
  }

  /**
   * Enable or disable a specific shortcut
   */
  public setShortcutEnabled(id: string, enabled: boolean): void {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      shortcut.disabled = !enabled;
      this.shortcuts.set(id, shortcut);
      this.saveShortcuts();
    }
  }

  /**
   * Enable or disable all shortcuts
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if shortcuts are enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Update a shortcut's key combination
   */
  public updateShortcut(id: string, key: string, modifiers: { ctrlKey?: boolean, altKey?: boolean, shiftKey?: boolean, metaKey?: boolean }): boolean {
    const shortcut = this.shortcuts.get(id);
    if (!shortcut) return false;
    
    // Check for conflicts
    if (this.hasConflict(id, key, modifiers)) {
      return false;
    }
    
    // Update the shortcut
    shortcut.key = key;
    shortcut.ctrlKey = modifiers.ctrlKey;
    shortcut.altKey = modifiers.altKey;
    shortcut.shiftKey = modifiers.shiftKey;
    shortcut.metaKey = modifiers.metaKey;
    shortcut.custom = true;
    
    this.shortcuts.set(id, shortcut);
    this.saveShortcuts();
    
    return true;
  }

  /**
   * Check if a key combination conflicts with existing shortcuts
   */
  private hasConflict(id: string, key: string, modifiers: { ctrlKey?: boolean, altKey?: boolean, shiftKey?: boolean, metaKey?: boolean }): boolean {
    for (const [shortcutId, shortcut] of this.shortcuts.entries()) {
      // Skip the shortcut we're updating
      if (shortcutId === id) continue;
      
      // Skip disabled shortcuts
      if (shortcut.disabled) continue;
      
      // Check if the key combination matches
      if (shortcut.key.toLowerCase() === key.toLowerCase() &&
          !!shortcut.ctrlKey === !!modifiers.ctrlKey &&
          !!shortcut.altKey === !!modifiers.altKey &&
          !!shortcut.shiftKey === !!modifiers.shiftKey &&
          !!shortcut.metaKey === !!modifiers.metaKey) {
        
        // Check context overlap
        const sameContext = !shortcut.context || !this.shortcuts.get(id)?.context || 
                           shortcut.context === this.shortcuts.get(id)?.context;
        const eitherGlobal = shortcut.global || this.shortcuts.get(id)?.global;
        
        if (sameContext || eitherGlobal) {
          return true; // Conflict found
        }
      }
    }
    
    return false; // No conflict
  }

  /**
   * Reset a shortcut to its default
   */
  public resetShortcut(id: string): void {
    const shortcut = this.shortcuts.get(id);
    if (shortcut && shortcut.custom) {
      // We would need to store the original defaults to implement this properly
      // For now, just mark it as not custom
      shortcut.custom = false;
      this.shortcuts.set(id, shortcut);
      this.saveShortcuts();
    }
  }

  /**
   * Reset all shortcuts to defaults
   */
  public resetAllShortcuts(): void {
    // We would need to store the original defaults to implement this properly
    // For now, just remove the custom flag from all shortcuts
    for (const [id, shortcut] of this.shortcuts.entries()) {
      if (shortcut.custom) {
        shortcut.custom = false;
        this.shortcuts.set(id, shortcut);
      }
    }
    this.saveShortcuts();
  }

  /**
   * Save shortcuts to localStorage
   */
  private saveShortcuts(): void {
    const customShortcuts = Array.from(this.shortcuts.values())
      .filter(shortcut => shortcut.custom || shortcut.disabled)
      .map(shortcut => ({
        id: shortcut.id,
        key: shortcut.key,
        ctrlKey: shortcut.ctrlKey,
        altKey: shortcut.altKey,
        shiftKey: shortcut.shiftKey,
        metaKey: shortcut.metaKey,
        disabled: shortcut.disabled,
        custom: shortcut.custom
      }));
    
    localStorage.setItem('keyboard-shortcuts', JSON.stringify(customShortcuts));
  }

  /**
   * Load shortcuts from localStorage
   */
  private loadShortcuts(): void {
    const data = localStorage.getItem('keyboard-shortcuts');
    if (data) {
      try {
        const customShortcuts = JSON.parse(data);
        customShortcuts.forEach((customShortcut: any) => {
          const shortcut = this.shortcuts.get(customShortcut.id);
          if (shortcut) {
            // Update existing shortcut with custom settings
            if (customShortcut.custom) {
              shortcut.key = customShortcut.key;
              shortcut.ctrlKey = customShortcut.ctrlKey;
              shortcut.altKey = customShortcut.altKey;
              shortcut.shiftKey = customShortcut.shiftKey;
              shortcut.metaKey = customShortcut.metaKey;
              shortcut.custom = true;
            }
            
            // Update disabled state
            shortcut.disabled = customShortcut.disabled;
            
            this.shortcuts.set(shortcut.id, shortcut);
          }
        });
      } catch (error) {
        console.error('Failed to load keyboard shortcuts:', error);
      }
    }
  }

  /**
   * Register a new category
   */
  public registerCategory(category: KeyboardShortcutCategory): void {
    this.categories.set(category.id, category);
  }

  /**
   * Get all categories
   */
  public getCategories(): KeyboardShortcutCategory[] {
    return Array.from(this.categories.values());
  }

  /**
   * Format a shortcut for display
   */
  public formatShortcut(shortcut: KeyboardShortcut): string {
    const parts = [];
    
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.altKey) parts.push('Alt');
    if (shortcut.shiftKey) parts.push('Shift');
    if (shortcut.metaKey) parts.push('Meta');
    
    parts.push(shortcut.key.toUpperCase());
    
    return parts.join(' + ');
  }
}

export const keyboardShortcutsService = new KeyboardShortcutsService();
export default keyboardShortcutsService;
