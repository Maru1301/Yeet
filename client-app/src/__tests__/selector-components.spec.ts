import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

const vuetify = createVuetify({ components, directives });

vi.mock('../global/gpt.api.service', () => ({
  gptService: {
    models: {
      request: vi.fn().mockResolvedValue({ data: [
        { name: 'gpt-4', displayName: 'GPT-4', isAgent: false },
        { name: 'agent-1', displayName: 'Agent One', isAgent: true },
      ] }),
    },
  },
}));

vi.mock('../components/prompts/PromptStore', () => ({
  list: vi.fn().mockResolvedValue([
    { id: '1', title: 'Test Prompt', prompt: 'Hello world', favorite: false, createdAt: 1000, updatedAt: 1000 },
    { id: '2', title: 'Fav Prompt', prompt: 'My fav prompt', favorite: true, createdAt: 2000, updatedAt: 2000 },
  ]),
}));

// ---- AI.ModelSelector.vue ----
describe('AI.ModelSelector.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders department name when provided', async () => {
    const { default: ModelSelector } = await import('../components/AI.ModelSelector.vue');
    const wrapper = mount(ModelSelector, {
      props: {
        conversation: null,
        usedModel: { name: 'gpt-4', displayName: 'GPT-4', isAgent: false },
        department: 'MIS',
      },
      global: { plugins: [vuetify] },
    });
    expect(wrapper.text()).toContain('MIS');
  });

  it('renders Workspace when no department provided', async () => {
    const { default: ModelSelector } = await import('../components/AI.ModelSelector.vue');
    const wrapper = mount(ModelSelector, {
      props: {
        conversation: null,
        usedModel: { name: 'gpt-4', displayName: 'GPT-4', isAgent: false },
      },
      global: { plugins: [vuetify] },
    });
    expect(wrapper.text()).toContain('Workspace');
  });

  it('renders usedModel displayName', async () => {
    const { default: ModelSelector } = await import('../components/AI.ModelSelector.vue');
    const wrapper = mount(ModelSelector, {
      props: {
        conversation: null,
        usedModel: { name: 'gpt-4', displayName: 'GPT-4', isAgent: false },
      },
      global: { plugins: [vuetify] },
    });
    expect(wrapper.text()).toContain('GPT-4');
  });

  it('emits update:usedModel on selectModel call', async () => {
    const { default: ModelSelector } = await import('../components/AI.ModelSelector.vue');
    const wrapper = mount(ModelSelector, {
      props: {
        conversation: null,
        usedModel: { name: 'gpt-4', displayName: 'GPT-4', isAgent: false },
      },
      global: { plugins: [vuetify] },
    });
    const model = { name: 'agent-1', displayName: 'Agent One', isAgent: true };
    (wrapper.vm as any).selectModel(model);
    const emitted = wrapper.emitted('update:usedModel');
    expect(emitted).toBeTruthy();
    expect(emitted![0][0]).toMatchObject({ name: 'agent-1' });
  });

  it('selectModelByConversation picks agent model for agent conversation', async () => {
    const { default: ModelSelector } = await import('../components/AI.ModelSelector.vue');
    const wrapper = mount(ModelSelector, {
      props: {
        conversation: null,
        usedModel: { name: 'gpt-4', displayName: 'GPT-4', isAgent: false },
      },
      global: { plugins: [vuetify] },
    });
    // Seed models
    (wrapper.vm as any).models = [
      { name: 'gpt-4', displayName: 'GPT-4', isAgent: false },
      { name: 'agent-1', displayName: 'Agent One', isAgent: true },
    ];
    (wrapper.vm as any).selectModelByConversation({ isAgent: true, modelName: 'agent-1' });
    const emitted = wrapper.emitted('update:usedModel');
    expect(emitted).toBeTruthy();
    expect((emitted!.at(-1)![0] as any).name).toBe('agent-1');
  });
});

// ---- AI.ExpertSelector.vue ----
describe('AI.ExpertSelector.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders expert selector button', async () => {
    const { default: ExpertSelector } = await import('../components/AI.ExpertSelector.vue');
    const wrapper = mount(ExpertSelector, { global: { plugins: [vuetify] } });
    expect(wrapper.findComponent({ name: 'VBtn' }).exists()).toBe(true);
  });

  it('filters prompts by search term', async () => {
    const { default: ExpertSelector } = await import('../components/AI.ExpertSelector.vue');
    const wrapper = mount(ExpertSelector, { global: { plugins: [vuetify] } });
    (wrapper.vm as any).search = 'Flowchart';
    await wrapper.vm.$nextTick();
    const results = (wrapper.vm as any).searching;
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toContain('Flowchart');
  });

  it('shows all prompts when search is empty', async () => {
    const { default: ExpertSelector } = await import('../components/AI.ExpertSelector.vue');
    const wrapper = mount(ExpertSelector, { global: { plugins: [vuetify] } });
    (wrapper.vm as any).search = '';
    const allCount = (wrapper.vm as any).searching.length;
    expect(allCount).toBeGreaterThan(0);
  });

  it('emits selected with enhanced prompt and autoSend=true on itemClick', async () => {
    const { default: ExpertSelector } = await import('../components/AI.ExpertSelector.vue');
    const wrapper = mount(ExpertSelector, { global: { plugins: [vuetify] } });
    const item = (wrapper.vm as any).prompts[0];
    (wrapper.vm as any).itemClick(item);
    const emitted = wrapper.emitted('selected');
    expect(emitted).toBeTruthy();
    expect(emitted![0][1]).toBe(true); // autoSend = true
    expect((emitted![0][0] as any).prompt).toContain('Formatting and Language');
  });
});

// ---- AI.PromptSelector.vue ----
describe('AI.PromptSelector.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('loads prompts on mount', async () => {
    const { default: PromptSelector } = await import('../components/AI.PromptSelector.vue');
    const wrapper = mount(PromptSelector, { global: { plugins: [vuetify] } });
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick(); // allow async reload
    expect((wrapper.vm as any).prompts.length).toBeGreaterThan(0);
  });

  it('filters prompts by search term', async () => {
    const { default: PromptSelector } = await import('../components/AI.PromptSelector.vue');
    const wrapper = mount(PromptSelector, { global: { plugins: [vuetify] } });
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    (wrapper.vm as any).search = 'fav';
    const results = (wrapper.vm as any).filtered;
    expect(results.some((p: any) => p.title.toLowerCase().includes('fav'))).toBe(true);
  });

  it('emits selected with title and prompt on pick', async () => {
    const { default: PromptSelector } = await import('../components/AI.PromptSelector.vue');
    const wrapper = mount(PromptSelector, { global: { plugins: [vuetify] } });
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    const item = (wrapper.vm as any).prompts[0];
    (wrapper.vm as any).pick(item);
    const emitted = wrapper.emitted('selected');
    expect(emitted).toBeTruthy();
    expect(emitted![0][0]).toMatchObject({ title: item.title, prompt: item.prompt });
  });

  it('emits edit and closes menu on openManager', async () => {
    const { default: PromptSelector } = await import('../components/AI.PromptSelector.vue');
    const wrapper = mount(PromptSelector, { global: { plugins: [vuetify] } });
    (wrapper.vm as any).menu = true;
    (wrapper.vm as any).openManager();
    expect(wrapper.emitted('edit')).toBeTruthy();
    expect((wrapper.vm as any).menu).toBe(false);
  });

  it('oneLine truncates and collapses whitespace', async () => {
    const { default: PromptSelector } = await import('../components/AI.PromptSelector.vue');
    const wrapper = mount(PromptSelector, { global: { plugins: [vuetify] } });
    const result = (wrapper.vm as any).oneLine('  Hello   World  '.repeat(20));
    expect(result.length).toBeLessThanOrEqual(160);
    expect(result).not.toMatch(/\s{2,}/);
  });
});
