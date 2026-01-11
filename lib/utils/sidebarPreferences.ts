/**
 * Utility functions for managing sidebar order preferences
 * Stores preferences in localStorage with user-specific keys
 */

export interface SidebarItem {
  title: string;
  url: string;
  icon: string; // Store icon name as string for serialization
}

const STORAGE_KEY_PREFIX = 'sidebar_order_';
const STORAGE_ENABLED_KEY_PREFIX = 'sidebar_custom_order_enabled_';

/**
 * Get storage key for a specific user
 */
function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

/**
 * Get enabled preference key for a specific user
 */
function getEnabledKey(userId: string): string {
  return `${STORAGE_ENABLED_KEY_PREFIX}${userId}`;
}

/**
 * Check if custom sidebar ordering is enabled for a user
 */
export function isCustomOrderEnabled(userId: string | null): boolean {
  if (!userId) return false;
  
  try {
    const enabled = localStorage.getItem(getEnabledKey(userId));
    return enabled === 'true';
  } catch (error) {
    console.error('[SidebarPreferences] Error reading enabled preference:', error);
    return false;
  }
}

/**
 * Enable or disable custom sidebar ordering for a user
 */
export function setCustomOrderEnabled(userId: string | null, enabled: boolean): void {
  if (!userId) return;
  
  try {
    localStorage.setItem(getEnabledKey(userId), enabled ? 'true' : 'false');
    
    // Dispatch custom event to notify other components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sidebarPreferencesChanged', { 
        detail: { userId } 
      }));
    }
  } catch (error) {
    console.error('[SidebarPreferences] Error saving enabled preference:', error);
  }
}

/**
 * Get custom sidebar order for a user
 */
export function getSidebarOrder(userId: string | null): string[] | null {
  if (!userId) return null;
  
  try {
    const stored = localStorage.getItem(getStorageKey(userId));
    if (!stored) return null;
    
    const order = JSON.parse(stored) as string[];
    return Array.isArray(order) ? order : null;
  } catch (error) {
    console.error('[SidebarPreferences] Error reading sidebar order:', error);
    return null;
  }
}

/**
 * Save custom sidebar order for a user
 */
export function saveSidebarOrder(userId: string | null, order: string[]): void {
  if (!userId) return;
  
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(order));
    
    // Dispatch custom event to notify other components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sidebarPreferencesChanged', { 
        detail: { userId } 
      }));
    }
  } catch (error) {
    console.error('[SidebarPreferences] Error saving sidebar order:', error);
  }
}

/**
 * Clear only the sidebar order (but keep the enabled preference)
 */
export function clearSidebarOrder(userId: string | null): void {
  if (!userId) return;
  
  try {
    localStorage.removeItem(getStorageKey(userId));
    
    // Dispatch custom event to notify other components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sidebarPreferencesChanged', { 
        detail: { userId } 
      }));
    }
  } catch (error) {
    console.error('[SidebarPreferences] Error clearing sidebar order:', error);
  }
}

/**
 * Clear sidebar preferences for a user
 */
export function clearSidebarPreferences(userId: string | null): void {
  if (!userId) return;
  
  try {
    localStorage.removeItem(getStorageKey(userId));
    localStorage.removeItem(getEnabledKey(userId));
  } catch (error) {
    console.error('[SidebarPreferences] Error clearing preferences:', error);
  }
}

/**
 * Apply custom order to menu items
 */
export function applyCustomOrder<T extends { title: string }>(
  items: T[],
  customOrder: string[] | null
): T[] {
  if (!customOrder || customOrder.length === 0) {
    return items;
  }

  // Create a map of items by title for quick lookup
  const itemMap = new Map(items.map(item => [item.title, item]));
  
  // Create ordered array based on custom order
  const ordered: T[] = [];
  const usedTitles = new Set<string>();
  
  // Add items in custom order
  for (const title of customOrder) {
    const item = itemMap.get(title);
    if (item) {
      ordered.push(item);
      usedTitles.add(title);
    }
  }
  
  // Add any remaining items that weren't in the custom order
  for (const item of items) {
    if (!usedTitles.has(item.title)) {
      ordered.push(item);
    }
  }
  
  return ordered;
}
