import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

const vuetify = createVuetify({ components, directives });

vi.mock('../components/prompts/PromptStore', () => ({
  list: vi.fn().mockResolvedValue([
    { id: '1', title: 'Test Prompt', prompt: 'Hello world', favorite: false, createdAt: 1000, updatedAt: 1000 },
    { id: '2', title: 'Fav Prompt', prompt: 'My fav prompt', favorite: true, createdAt: 2000, updatedAt: 2000 },
  ]),
  upsert: vi.fn().mockResolvedValue('new-id'),
  remove: vi.fn().mockResolvedValue(undefined),
  duplicate: vi.fn().mockResolvedValue('dup-id'),
  toggleFavorite: vi.fn().mockResolvedValue(undefined),
  exportAll: vi.fn().mockResolvedValue('[{"id":"1"}]'),
  importBatch: vi.fn().mockResolvedValue({ added: 1, updated: 0, skipped: 0 }),
}));

vi.mock('../components/AI.OptimizePromptButton.vue', () => ({
  default: {
    template: '<div></div>',
    props: ['input', 'len', 'isResponding', 'useXSmall', 'optimizing'],
  },
}));

// ---- AI.PromptCards.vue ----
describe('AI.PromptCards.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders at least one prompt card', async () => {
    const { default: PromptCards } = await import('../components/AI.PromptCards.vue');
    const wrapper = mount(PromptCards, { global: { plugins: [vuetify] } });
    expect(wrapper.findAllComponents({ name: 'VCard' }).length).toBeGreaterThan(0);
  });

  it('getRandomItems returns between 1 and 3 items', async () => {
    const { default: PromptCards } = await import('../components/AI.PromptCards.vue');
    const wrapper = mount(PromptCards, { global: { plugins: [vuetify] } });
    const items = (wrapper.vm as any).getRandomItems;
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(3);
  });

  it('emits selected with item on selectPrompt', async () => {
    const { default: PromptCards } = await import('../components/AI.PromptCards.vue');
    const wrapper = mount(PromptCards, { global: { plugins: [vuetify] } });
    const item = (wrapper.vm as any).getRandomItems[0];
    (wrapper.vm as any).selectPrompt(item);
    const emitted = wrapper.emitted('selected');
    expect(emitted).toBeTruthy();
    expect((emitted![0][0] as any).title).toBe(item.title);
  });
});

// ---- AI.PromptManager.vue ----
describe('AI.PromptManager.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders My Prompts title', async () => {
    const { default: PromptManager } = await import('../components/AI.PromptManager.vue');
    const wrapper = mount(PromptManager, { global: { plugins: [vuetify] } });
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('My Prompts');
  });

  it('loads prompts on mount', async () => {
    const store = await import('../components/prompts/PromptStore');
    const { default: PromptManager } = await import('../components/AI.PromptManager.vue');
    const wrapper = mount(PromptManager, { global: { plugins: [vuetify] } });
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    expect(store.list).toHaveBeenCalled();
    expect((wrapper.vm as any).list.length).toBeGreaterThan(0);
  });

  it('select() populates form fields', async () => {
    const { default: PromptManager } = await import('../components/AI.PromptManager.vue');
    const wrapper = mount(PromptManager, { global: { plugins: [vuetify] } });
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    const item = { id: 'test-id', title: 'Test Title', prompt: 'Test prompt', favorite: true, createdAt: 100, updatedAt: 100 };
    (wrapper.vm as any).select(item);
    expect((wrapper.vm as any).form.id).toBe('test-id');
    expect((wrapper.vm as any).form.title).toBe('Test Title');
    expect((wrapper.vm as any).form.favorite).toBe(true);
  });

  it('filtered returns all items when search is empty', async () => {
    const { default: PromptManager } = await import('../components/AI.PromptManager.vue');
    const wrapper = mount(PromptManager, { global: { plugins: [vuetify] } });
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    (wrapper.vm as any).search = '';
    expect((wrapper.vm as any).filtered.length).toBe(2);
  });

  it('filtered filters by search term', async () => {
    const { default: PromptManager } = await import('../components/AI.PromptManager.vue');
    const wrapper = mount(PromptManager, { global: { plugins: [vuetify] } });
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    (wrapper.vm as any).search = 'fav';
    expect((wrapper.vm as any).filtered.length).toBe(1);
    expect((wrapper.vm as any).filtered[0].title).toBe('Fav Prompt');
  });

  it('save() calls store.upsert', async () => {
    const store = await import('../components/prompts/PromptStore');
    const { default: PromptManager } = await import('../components/AI.PromptManager.vue');
    const wrapper = mount(PromptManager, { global: { plugins: [vuetify] } });
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    (wrapper.vm as any).form.title = 'New Title';
    await (wrapper.vm as any).save();
    expect(store.upsert).toHaveBeenCalled();
  });

  it('removeItem() calls store.remove with correct id', async () => {
    const store = await import('../components/prompts/PromptStore');
    const { default: PromptManager } = await import('../components/AI.PromptManager.vue');
    const wrapper = mount(PromptManager, { global: { plugins: [vuetify] } });
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    await (wrapper.vm as any).removeItem({ id: '1' });
    expect(store.remove).toHaveBeenCalledWith('1');
  });

  it('duplicateItem() calls store.duplicate with correct id', async () => {
    const store = await import('../components/prompts/PromptStore');
    const { default: PromptManager } = await import('../components/AI.PromptManager.vue');
    const wrapper = mount(PromptManager, { global: { plugins: [vuetify] } });
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    await (wrapper.vm as any).duplicateItem({ id: '2' });
    expect(store.duplicate).toHaveBeenCalledWith('2');
  });

  it('toggleFav() calls store.toggleFavorite with correct id', async () => {
    const store = await import('../components/prompts/PromptStore');
    const { default: PromptManager } = await import('../components/AI.PromptManager.vue');
    const wrapper = mount(PromptManager, { global: { plugins: [vuetify] } });
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    await (wrapper.vm as any).toggleFav({ id: '1' });
    expect(store.toggleFavorite).toHaveBeenCalledWith('1');
  });

  it('reset() restores form to selected item', async () => {
    const { default: PromptManager } = await import('../components/AI.PromptManager.vue');
    const wrapper = mount(PromptManager, { global: { plugins: [vuetify] } });
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    (wrapper.vm as any).form.title = 'Changed Title';
    (wrapper.vm as any).reset();
    expect((wrapper.vm as any).form.title).toBe('Test Prompt');
  });

  it('emits backToChat when back button is clicked', async () => {
    const { default: PromptManager } = await import('../components/AI.PromptManager.vue');
    const wrapper = mount(PromptManager, { global: { plugins: [vuetify] } });
    const allBtns = wrapper.findAllComponents({ name: 'VBtn' });
    await allBtns[0].trigger('click');
    expect(wrapper.emitted('backToChat')).toBeTruthy();
  });
});
