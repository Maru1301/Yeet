import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { deriveLabel } from '../global/outline.utils';
import { useOutlineStore } from '../store/outline';

// ── T004: deriveLabel unit tests ──────────────────────────────────────────────

describe('deriveLabel', () => {
  it('returns first 8 words of a normal sentence', () => {
    expect(deriveLabel('one two three four five six seven eight nine ten'))
      .toBe('one two three four five six seven eight');
  });

  it('returns the full text when fewer than 8 words', () => {
    expect(deriveLabel('hello world')).toBe('hello world');
  });

  it('strips a leading code fence and uses first content line', () => {
    const content = '```javascript\nconst x = 1;\n```\nsome text after';
    // should skip fence, grab first words of "const x = 1;"
    expect(deriveLabel(content)).toBe('const x = 1;');
  });

  it('returns [media] for empty string', () => {
    expect(deriveLabel('')).toBe('[media]');
  });

  it('returns [media] for whitespace-only string', () => {
    expect(deriveLabel('   \n\t  ')).toBe('[media]');
  });

  it('handles a single short word without ellipsis', () => {
    expect(deriveLabel('OK')).toBe('OK');
  });

  it('handles emoji / unicode content', () => {
    expect(deriveLabel('👍')).toBe('👍');
  });

  it('truncates to last full word within 60 bytes and adds ellipsis', () => {
    // 8 words each ~8 chars → well over 60 bytes
    const long = 'abcdefgh ijklmnop qrstuvwx abcdefgh ijklmnop qrstuvwx abcdefgh ijklmnop extra';
    const result = deriveLabel(long);
    expect(result.endsWith('…')).toBe(true);
    const withoutEllipsis = result.slice(0, -1); // remove '…' (1 char)
    expect(new TextEncoder().encode(withoutEllipsis).length).toBeLessThanOrEqual(60);
  });

  it('normalises multiple spaces and newlines between words', () => {
    expect(deriveLabel('hello   world\nfoo')).toBe('hello world foo');
  });
});

// ── T017: useOutlineStore unit tests ──────────────────────────────────────────

vi.mock('../global/gpt.api.service', () => ({
  gptService: {
    outline: {
      request: vi.fn(),
    },
  },
}));

import { gptService } from '../global/gpt.api.service';

describe('useOutlineStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('initialises with empty state', () => {
    const store = useOutlineStore();
    expect(store.entries).toEqual([]);
    expect(store.visible).toBe(false);
    expect(store.activeIndex).toBe(0);
    expect(store.conversationId).toBeNull();
  });

  it('setVisible toggles panel open/close', () => {
    const store = useOutlineStore();
    store.setVisible(true);
    expect(store.visible).toBe(true);
    store.setVisible(false);
    expect(store.visible).toBe(false);
  });

  it('setActiveIndex updates activeIndex', () => {
    const store = useOutlineStore();
    store.setActiveIndex(3);
    expect(store.activeIndex).toBe(3);
  });

  it('fetchEntries populates entries from API response', async () => {
    const store = useOutlineStore();
    const mockEntries = [
      { index: 0, role: 'user', label: 'Hello there' },
      { index: 1, role: 'assistant', label: 'Sure! The concept' },
    ];
    vi.mocked(gptService.outline.request).mockResolvedValue({
      data: { entries: mockEntries },
    });

    await store.fetchEntries('conv-123');

    expect(store.conversationId).toBe('conv-123');
    expect(store.entries).toEqual(mockEntries);
  });

  it('fetchEntries sets empty entries on empty response', async () => {
    const store = useOutlineStore();
    vi.mocked(gptService.outline.request).mockResolvedValue({
      data: { entries: [] },
    });

    await store.fetchEntries('conv-empty');
    expect(store.entries).toEqual([]);
  });

  it('appendEntry adds a new entry with derived label', () => {
    const store = useOutlineStore();
    store.appendEntry('Hello world this is a new message content extra words', 'user');
    expect(store.entries).toHaveLength(1);
    expect(store.entries[0].role).toBe('user');
    expect(store.entries[0].index).toBe(0);
    expect(store.entries[0].label).toBeTruthy();
  });

  it('appendEntry increments index based on existing entries', () => {
    const store = useOutlineStore();
    store.appendEntry('First message', 'user');
    store.appendEntry('Second message', 'assistant');
    expect(store.entries[1].index).toBe(1);
  });

  it('fetchEntries clears previous entries before populating', async () => {
    const store = useOutlineStore();
    store.appendEntry('old entry', 'user');
    vi.mocked(gptService.outline.request).mockResolvedValue({
      data: { entries: [{ index: 0, role: 'user', label: 'fresh entry' }] },
    });
    await store.fetchEntries('conv-new');
    expect(store.entries).toHaveLength(1);
    expect(store.entries[0].label).toBe('fresh entry');
  });
});
