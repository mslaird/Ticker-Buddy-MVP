/**
 * Chrome Storage Adapter for Supabase
 *
 * This allows the extension and web app to share the same authentication session
 * by using chrome.storage.local instead of localStorage.
 */

export class ChromeStorageAdapter {
  async getItem(key: string): Promise<string | null> {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] || null;
    } catch (error) {
      console.error('[ChromeStorage] Error getting item:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      console.error('[ChromeStorage] Error setting item:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await chrome.storage.local.remove(key);
    } catch (error) {
      console.error('[ChromeStorage] Error removing item:', error);
    }
  }
}
