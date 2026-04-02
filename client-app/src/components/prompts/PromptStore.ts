// PromptStore: IndexedDB-backed prompt manager with localStorage migration
// Prompt shape: { id, title, prompt, favorite: boolean, createdAt, updatedAt }
import { v4 as uuidv4 } from 'uuid';
import storageAdapter from './StorageAdapter';

export interface Prompt {
  id: string;
  title: string;
  prompt: string;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
}

const STORAGE_KEY = 'ktc.prompts.v1'; // Legacy key for migration

// Utility: get current timestamp
const getTimestamp = () => Date.now();

// Utility: generate RFC4122-compliant UUID
const generateId = () => uuidv4();

// Load all prompts from IndexedDB, ensure each has an id
export async function load(): Promise<Prompt[]> {
  await storageAdapter.initWithMigration(); // Initialize and migrate if needed
  const arr = await storageAdapter.loadAll();
  let changed = false;
  for (const prompt of arr) {
    if (!prompt.id) {
      prompt.id = generateId();
      changed = true;
    }
  }
  const entries = arr.map(normalizePrompt);
  if (changed) await save(entries); // persist id fix
  return entries;
}


// Save all prompts to IndexedDB
export async function save(entries: Prompt[]): Promise<void> {
  await storageAdapter.saveAll(entries || []);
}


// List all prompts
export async function list(): Promise<Prompt[]> {
  return load();
}


// Add or update a prompt
export async function upsert(item: Partial<Prompt>): Promise<string> {
  const items = await load();
  const idx = item.id ? items.findIndex(p => p.id === item.id) : -1;
  const ts = getTimestamp();
  if (idx >= 0) {
    // Update existing
    const updated = { ...items[idx], ...item, updatedAt: ts };
    items.splice(idx, 1, normalizePrompt(updated));
  } else {
    // Add new
    const toAdd = normalizePrompt({
      title: '',
      prompt: '',
      favorite: false,
      createdAt: ts,
      updatedAt: ts,
      ...item,
    } as Prompt);
    toAdd.id = generateId();
    items.push(toAdd);
    item.id = toAdd.id;
  }
  await save(items);
  return item.id!;
}


// Remove a prompt by id
export async function remove(id: string): Promise<void> {
  if (!id) return; // guard against wiping all
  const before = await load();
  const after = before.filter(p => p.id !== id);
  if (after.length !== before.length) await save(after);
}


// Toggle favorite status for a prompt
export async function toggleFavorite(id: string): Promise<void> {
  const items = await load();
  const idx = items.findIndex(p => p.id === id);
  if (idx >= 0) {
    items[idx] = {
      ...items[idx],
      favorite: !items[idx].favorite,
      updatedAt: getTimestamp(),
    };
    await save(items);
  }
}


// Duplicate a prompt by id
export async function duplicate(id: string): Promise<string | null> {
  const items = await load();
  const found = items.find(p => p.id === id);
  if (!found) return null;
  const copy: Partial<Prompt> = {
    ...found,
    id: undefined,
    title: `${found.title} (copy)`,
  };
  return upsert(copy);
}


// Import a batch of prompts, dedupe by id and title+prompt
export async function importBatch(items: Partial<Prompt>[] = []): Promise<{ added: number; updated: number; skipped: number }> {
  if (!Array.isArray(items)) return { added: 0, updated: 0, skipped: 0 };
  const existing = await load();
  const byId = new Map(existing.map(p => [p.id, p]));
  let added = 0, updated = 0, skipped = 0;
  for (const raw of items) {
    const p = normalizePrompt(raw as Prompt);
    if (!p.title || !p.prompt) { skipped++; continue; }
    if (p.id && byId.has(p.id)) {
      // update existing
      byId.set(p.id, { ...byId.get(p.id)!, ...p, updatedAt: getTimestamp() });
      updated++;
    } else {
      // dedupe by title+prompt
      const dup = existing.find(x => x.title === p.title && x.prompt === p.prompt);
      if (dup) { skipped++; continue; }
      const newItem: Prompt = {
        ...p,
        id: generateId(),
        createdAt: getTimestamp(),
        updatedAt: getTimestamp(),
      };
      byId.set(newItem.id, newItem);
      added++;
    }
  }
  await save(Array.from(byId.values()));
  return { added, updated, skipped };
}


// Export all prompts as JSON string
export async function exportAll(): Promise<string> {
  const data = await load();
  return JSON.stringify(data);
}


// Normalize a prompt object
function normalizePrompt(p: Partial<Prompt>): Prompt {
  return {
    id: p.id!,
    title: String(p.title || '').trim(),
    prompt: String(p.prompt || ''),
    favorite: Boolean(p.favorite),
    createdAt: typeof p.createdAt === 'number' ? p.createdAt : getTimestamp(),
    updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : getTimestamp(),
  };
}


// Export API
export default {
  STORAGE_KEY,
  list,
  load,
  save,
  upsert,
  remove,
  toggleFavorite,
  duplicate,
  importBatch,
  exportAll,
};
