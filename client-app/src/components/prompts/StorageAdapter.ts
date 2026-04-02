// IndexedDB Storage Adapter for Prompt Management
// Provides localStorage-compatible API with IndexedDB backend

const DB_NAME = 'KTC_PromptDB';
const DB_VERSION = 1;
const STORE_NAME = 'prompts';
const LEGACY_STORAGE_KEY = 'ktc.prompts.v1';

class IndexedDBAdapter {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  // Initialize IndexedDB connection
  async init(): Promise<IDBDatabase> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store for prompts
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          // Create indexes for common queries
          store.createIndex('favorite', 'favorite', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  // Ensure database is initialized
  async ensureInit(): Promise<IDBDatabase> {
    if (!this.db) await this.init();
    return this.db!;
  }

  // Get object store for operations
  getStore(mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    return this.db!.transaction([STORE_NAME], mode).objectStore(STORE_NAME);
  }

  // Load all prompts from IndexedDB
  async loadAll(): Promise<any[]> {
    await this.ensureInit();

    return new Promise((resolve, reject) => {
      const store = this.getStore('readonly');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Save all prompts to IndexedDB (for compatibility with localStorage API)
  async saveAll(prompts: any[]): Promise<void> {
    await this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Clear existing data
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => {
        // Add all prompts
        const promises = prompts.map(prompt => {
          return new Promise<void>((res, rej) => {
            const addRequest = store.add(prompt);
            addRequest.onsuccess = () => res();
            addRequest.onerror = () => rej(addRequest.error);
          });
        });

        Promise.all(promises).then(() => resolve()).catch(reject);
      };

      clearRequest.onerror = () => reject(clearRequest.error);
    });
  }

  // Add or update a single prompt
  async upsert(prompt: any): Promise<string> {
    await this.ensureInit();

    return new Promise((resolve, reject) => {
      const store = this.getStore('readwrite');
      const request = store.put(prompt);

      request.onsuccess = () => resolve(prompt.id);
      request.onerror = () => reject(request.error);
    });
  }

  // Remove a prompt by id
  async remove(id: string): Promise<void> {
    await this.ensureInit();

    return new Promise((resolve, reject) => {
      const store = this.getStore('readwrite');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Check if migration from localStorage is needed
  async checkMigrationNeeded(): Promise<boolean> {
    const legacyData = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacyData) return false;

    // Check if IndexedDB is empty
    const existingData = await this.loadAll();
    return existingData.length === 0;
  }

  // Migrate data from localStorage to IndexedDB
  async migrateFromLocalStorage(): Promise<{ migrated: number }> {
    const legacyData = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacyData) return { migrated: 0 };

    try {
      const prompts = JSON.parse(legacyData);
      if (!Array.isArray(prompts)) return { migrated: 0 };

      await this.saveAll(prompts);

      // Remove legacy data after successful migration
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);

      return { migrated: prompts.length };
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  // Initialize with migration check
  async initWithMigration(): Promise<{ migrated: number }> {
    await this.init();

    if (await this.checkMigrationNeeded()) {
      const result = await this.migrateFromLocalStorage();
      console.log(`Migrated ${result.migrated} prompts from localStorage to IndexedDB`);
      return result;
    }

    return { migrated: 0 };
  }
}

// Create singleton instance
const storageAdapter = new IndexedDBAdapter();

export default storageAdapter;
