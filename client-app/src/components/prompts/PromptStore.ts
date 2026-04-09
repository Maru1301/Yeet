// PromptStore: Go backend-backed prompt manager
// Public API is unchanged — all callers (PromptManager, PromptSelector) work without modification.
import { gptService } from '../../global/gpt.api.service';

export interface Prompt {
  id: string;
  title: string;
  prompt: string;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
}

// ── one-time IndexedDB → backend migration ────────────────────────────────────

const MIGRATION_FLAG = 'yeet.prompts.migrated';
let migrationRan = false;

async function runMigration(): Promise<void> {
  if (migrationRan || localStorage.getItem(MIGRATION_FLAG)) {
    migrationRan = true;
    return;
  }
  migrationRan = true;
  localStorage.setItem(MIGRATION_FLAG, '1');
  try {
    const { default: storageAdapter } = await import('./StorageAdapter');
    await storageAdapter.init();
    const items: Prompt[] = await storageAdapter.loadAll();
    if (items.length > 0) {
      await gptService.prompts.import.request({ prompts: items });
      await storageAdapter.saveAll([]);
      console.log(`Migrated ${items.length} prompts from IndexedDB to backend`);
    }
  } catch (e) {
    console.warn('Prompt migration skipped:', e);
  }
}

// ── public API ────────────────────────────────────────────────────────────────

export async function list(): Promise<Prompt[]> {
  await runMigration();
  const resp = await gptService.prompts.list.request();
  return (resp?.data?.prompts ?? []) as Prompt[];
}

export async function load(): Promise<Prompt[]> {
  return list();
}

export async function upsert(item: Partial<Prompt>): Promise<string> {
  const resp = await gptService.prompts.upsert.request(item);
  return resp?.data?.id as string;
}

export async function remove(id: string): Promise<void> {
  if (!id) return;
  await gptService.prompts.delete.request({ id });
}

export async function toggleFavorite(id: string): Promise<void> {
  const items = await list();
  const found = items.find(p => p.id === id);
  if (!found) return;
  await upsert({ ...found, favorite: !found.favorite });
}

export async function duplicate(id: string): Promise<string | null> {
  const items = await list();
  const found = items.find(p => p.id === id);
  if (!found) return null;
  return upsert({
    title: `${found.title} (copy)`,
    prompt: found.prompt,
    favorite: found.favorite,
  });
}

export async function importBatch(
  items: Partial<Prompt>[] = [],
): Promise<{ added: number; updated: number; skipped: number }> {
  if (!Array.isArray(items) || items.length === 0) return { added: 0, updated: 0, skipped: 0 };
  const resp = await gptService.prompts.import.request({ prompts: items });
  return resp?.data ?? { added: 0, updated: 0, skipped: 0 };
}

export async function exportAll(): Promise<string> {
  const data = await list();
  return JSON.stringify(data);
}

// no-op kept for API compatibility (callers that used save() directly)
export async function save(_entries: Prompt[]): Promise<void> {}

export default {
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
