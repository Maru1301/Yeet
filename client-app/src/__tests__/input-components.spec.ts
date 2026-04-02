import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

const vuetify = createVuetify({ components, directives });

// ---- AI.Textarea.vue ----
describe('AI.Textarea.vue', () => {
  let wrapper: any;

  beforeEach(async () => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    const { default: Textarea } = await import('../components/AI.Textarea.vue');
    wrapper = mount(Textarea, {
      props: { input: '', isDisabled: false, rows: 1, chatId: 'chat-1', canSend: true },
      global: { plugins: [vuetify] },
    });
  });

  it('renders v-textarea', () => {
    expect(wrapper.findComponent({ name: 'VTextarea' }).exists()).toBe(true);
  });

  it('labelText returns initializing message when chatId is null', async () => {
    const { default: Textarea } = await import('../components/AI.Textarea.vue');
    const w = mount(Textarea, {
      props: { input: '', isDisabled: false, rows: 1, chatId: null, canSend: true },
      global: { plugins: [vuetify] },
    });
    expect((w.vm as any).labelText).toBe('Initializing conversation, please wait...');
  });

  it('labelText returns AI processing message when isDisabled', async () => {
    const { default: Textarea } = await import('../components/AI.Textarea.vue');
    const w = mount(Textarea, {
      props: { input: '', isDisabled: true, rows: 1, chatId: 'chat-1', canSend: true },
      global: { plugins: [vuetify] },
    });
    expect((w.vm as any).labelText).toBe('AI is processing, please wait a moment...');
  });

  it('labelText returns Send a message normally', () => {
    expect((wrapper.vm as any).labelText).toBe('Send a message.');
  });

  it('getBestMatchedPlugin returns @image for "@i"', () => {
    expect((wrapper.vm as any).getBestMatchedPlugin('@i')).toBe('@image');
  });

  it('getBestMatchedPlugin returns empty string for non-matching input', () => {
    expect((wrapper.vm as any).getBestMatchedPlugin('hello')).toBe('');
  });

  it('getPluginMatchType returns "at" for "@"', () => {
    expect((wrapper.vm as any).getPluginMatchType('@')).toBe('at');
  });

  it('getPluginMatchType returns "prefix" for "@im"', () => {
    expect((wrapper.vm as any).getPluginMatchType('@im')).toBe('prefix');
  });

  it('getPluginMatchType returns "exact" for "@image"', () => {
    expect((wrapper.vm as any).getPluginMatchType('@image')).toBe('exact');
  });

  it('getPluginMatchType returns "none" for unrelated text', () => {
    expect((wrapper.vm as any).getPluginMatchType('hello')).toBe('none');
  });

  it('selectPlugin sets localInput to plugin + space', () => {
    (wrapper.vm as any).selectPlugin('@image');
    expect((wrapper.vm as any).localInput).toBe('@image ');
  });

  it('keydown Enter with no plugin match emits send when canSend', () => {
    (wrapper.vm as any).localInput = 'Hello world';
    const event = { key: 'Enter', shiftKey: false, preventDefault: vi.fn() };
    (wrapper.vm as any).keydown(event);
    expect(wrapper.emitted('send')).toBeTruthy();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('keydown Enter with prefix match autocompletes and does not emit send', () => {
    (wrapper.vm as any).localInput = '@i';
    const event = { key: 'Enter', shiftKey: false, preventDefault: vi.fn() };
    (wrapper.vm as any).keydown(event);
    expect((wrapper.vm as any).localInput).toBe('@image ');
    expect(wrapper.emitted('send')).toBeFalsy();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('keydown Enter with Shift does not send', () => {
    (wrapper.vm as any).localInput = 'Hello';
    const event = { key: 'Enter', shiftKey: true, preventDefault: vi.fn() };
    (wrapper.vm as any).keydown(event);
    expect(wrapper.emitted('send')).toBeFalsy();
  });

  it('emits update:input when localInput changes', async () => {
    (wrapper.vm as any).localInput = 'typed text';
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:input')).toBeTruthy();
    expect(wrapper.emitted('update:input')![0][0]).toBe('typed text');
  });

  it('clears selectedPlugin and showPlugins when localInput becomes empty', async () => {
    (wrapper.vm as any).localInput = '';
    await wrapper.vm.$nextTick();
    expect((wrapper.vm as any).showPlugins).toBe(false);
    expect((wrapper.vm as any).selectedPlugin).toBe('');
  });
});

// ---- AI.FileUploader.vue ----
describe('AI.FileUploader.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders v-file-input', async () => {
    const { default: FileUploader } = await import('../components/AI.FileUploader.vue');
    const wrapper = mount(FileUploader, {
      props: { fileDataUri: null, fileInput: null },
      global: { plugins: [vuetify] },
    });
    expect(wrapper.findComponent({ name: 'VFileInput' }).exists()).toBe(true);
  });

  it('shows chip when fileDataUri is provided', async () => {
    const { default: FileUploader } = await import('../components/AI.FileUploader.vue');
    const wrapper = mount(FileUploader, {
      props: { fileDataUri: 'data:image/png;base64,abc', fileInput: null },
      global: { plugins: [vuetify] },
    });
    expect(wrapper.findComponent({ name: 'VChip' }).exists()).toBe(true);
  });

  it('does not show chip when fileDataUri is null', async () => {
    const { default: FileUploader } = await import('../components/AI.FileUploader.vue');
    const wrapper = mount(FileUploader, {
      props: { fileDataUri: null, fileInput: null },
      global: { plugins: [vuetify] },
    });
    expect(wrapper.findComponent({ name: 'VChip' }).exists()).toBe(false);
  });

  it('fileDataUriType extracts MIME type from data URI', async () => {
    const { default: FileUploader } = await import('../components/AI.FileUploader.vue');
    const wrapper = mount(FileUploader, {
      props: { fileDataUri: 'data:image/png;base64,abc123', fileInput: null },
      global: { plugins: [vuetify] },
    });
    expect((wrapper.vm as any).fileDataUriType).toBe('image/png');
  });

  it('fileDataUriType returns empty string when fileDataUri is null', async () => {
    const { default: FileUploader } = await import('../components/AI.FileUploader.vue');
    const wrapper = mount(FileUploader, {
      props: { fileDataUri: null, fileInput: null },
      global: { plugins: [vuetify] },
    });
    expect((wrapper.vm as any).fileDataUriType).toBe('');
  });

  it('removeFile emits update:fileDataUri with null', async () => {
    const { default: FileUploader } = await import('../components/AI.FileUploader.vue');
    const wrapper = mount(FileUploader, {
      props: { fileDataUri: 'data:image/png;base64,abc', fileInput: null },
      global: { plugins: [vuetify] },
    });
    await (wrapper.vm as any).removeFile();
    expect(wrapper.emitted('update:fileDataUri')).toBeTruthy();
    expect(wrapper.emitted('update:fileDataUri')![0][0]).toBeNull();
  });

  it('getFileIcon returns correct icon for PDF', async () => {
    const { default: FileUploader } = await import('../components/AI.FileUploader.vue');
    const wrapper = mount(FileUploader, {
      props: { fileDataUri: null, fileInput: null },
      global: { plugins: [vuetify] },
    });
    expect((wrapper.vm as any).getFileIcon('application/pdf').name).toBe('mdi-file-pdf-box');
  });

  it('getFileIcon returns empty object for unknown type', async () => {
    const { default: FileUploader } = await import('../components/AI.FileUploader.vue');
    const wrapper = mount(FileUploader, {
      props: { fileDataUri: null, fileInput: null },
      global: { plugins: [vuetify] },
    });
    expect((wrapper.vm as any).getFileIcon('unknown/type')).toEqual({});
  });
});
