import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

const vuetify = createVuetify({ components, directives });

vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({
    params: { department: 'MIS' },
    query: { conversationId: 'conv-123', isAgent: 'false' },
  })),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

vi.mock('../global/gpt.api.service', () => ({
  gptService: {
    record: {
      request: vi.fn().mockResolvedValue({
        data: {
          ChatHistory: [
            { Role: { Label: 'system' }, Items: [{ Text: 'system msg' }] },
            { Role: { Label: 'user' }, Items: [{ Text: 'Hello' }] },
            { Role: { Label: 'assistant' }, Items: [{ Text: 'Hi there' }] },
          ],
        },
      }),
    },
  },
}));

vi.mock('../utils/mermaidDownload', () => ({
  renderMermaidWithDownloads: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    run: vi.fn().mockResolvedValue(undefined),
  },
}));

// ---- AI.RecordViewer.vue ----
describe('AI.RecordViewer.vue', () => {
  let RecordViewer: any;

  beforeAll(async () => {
    // Pre-import to warm up heavy deps (mermaid, markdown-it, hljs) before tests run
    RecordViewer = (await import('../components/AI.RecordViewer.vue')).default;
  }, 20000);

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders KTCFE Copilot text', async () => {
    const wrapper = mount(RecordViewer, { global: { plugins: [vuetify] } });
    expect(wrapper.text()).toContain('KTCFE Copilot');
  });

  it('shows Conversation Records subtitle', async () => {
    const wrapper = mount(RecordViewer, { global: { plugins: [vuetify] } });
    expect(wrapper.text()).toContain('Conversation Records');
  });

  it('filteredRecords excludes system role messages', async () => {
    const wrapper = mount(RecordViewer, { global: { plugins: [vuetify] } });
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    const vm = wrapper.vm as any;
    vm.records = [
      { Role: { Label: 'system' }, Items: [{ Text: 'sys' }] },
      { Role: { Label: 'user' }, Items: [{ Text: 'hello' }] },
      { Role: { Label: 'assistant' }, Items: [{ Text: 'hi' }] },
    ];
    expect(vm.filteredRecords.length).toBe(2);
    expect(vm.filteredRecords.every((r: any) => r.Role.Label !== 'system')).toBe(true);
  });

  it('mapRecordsWithImage adds image field to each record', () => {
    const wrapper = mount(RecordViewer, { global: { plugins: [vuetify] } });
    const vm = wrapper.vm as any;
    const history = [
      { Role: { Label: 'user' }, Items: [{ Text: 'hello' }] },
      { Role: { Label: 'assistant' }, Items: [{ Text: 'hi', Data: 'abc', MimeType: 'image/png' }] },
    ];
    const result = vm.mapRecordsWithImage(history);
    expect(result[0]).toHaveProperty('image');
    expect(result[1].image).toBe('data:image/png;base64,abc');
  });

  it('firstImageDataUri returns empty string when no image items', () => {
    const wrapper = mount(RecordViewer, { global: { plugins: [vuetify] } });
    const vm = wrapper.vm as any;
    expect(vm.firstImageDataUri([{ Text: 'hello' }])).toBe('');
    expect(vm.firstImageDataUri([])).toBe('');
    expect(vm.firstImageDataUri(null)).toBe('');
  });

  it('firstImageDataUri returns data URI when image item found', () => {
    const wrapper = mount(RecordViewer, { global: { plugins: [vuetify] } });
    const vm = wrapper.vm as any;
    const result = vm.firstImageDataUri([{ Text: 'img', Data: 'base64data', MimeType: 'image/jpeg' }]);
    expect(result).toBe('data:image/jpeg;base64,base64data');
  });

  it('convertMarkdown wraps mermaid blocks in div.mermaid', () => {
    const wrapper = mount(RecordViewer, { global: { plugins: [vuetify] } });
    const vm = wrapper.vm as any;
    const result = vm.convertMarkdown('```mermaid\ngraph TD\nA --> B\n```');
    expect(result).toContain('<div class="mermaid">');
    expect(result).toContain('graph TD');
  });

  it('convertMarkdown renders regular markdown normally', () => {
    const wrapper = mount(RecordViewer, { global: { plugins: [vuetify] } });
    const vm = wrapper.vm as any;
    const result = vm.convertMarkdown('**bold text**');
    expect(result).toContain('<strong>bold text</strong>');
  });

  it('calls gptService.record.request on mount', async () => {
    const { gptService } = await import('../global/gpt.api.service');
    mount(RecordViewer, { global: { plugins: [vuetify] } });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(gptService.record.request).toHaveBeenCalled();
  });
});
