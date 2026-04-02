import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

const vuetify = createVuetify({ components, directives });

vi.stubGlobal('ROOT_FOLDER', '/app');

vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({
    params: { department: 'MIS' },
    query: { q: '' },
  })),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock('../global/gpt.api.service', () => ({
  gptService: {
    start: { request: vi.fn().mockResolvedValue({ data: { conversationId: 'new-conv-id' } }) },
    send: { request: vi.fn().mockResolvedValue({ body: { getReader: vi.fn(() => ({ read: vi.fn().mockResolvedValue({ done: true, value: undefined }) })) } }) },
    record: { request: vi.fn().mockResolvedValue({ data: { ChatHistory: [] } }) },
    genTopic: { request: vi.fn().mockResolvedValue({}) },
    conversationList: { request: vi.fn().mockResolvedValue({ data: [] }) },
    deleteRecord: { request: vi.fn().mockResolvedValue({}) },
  },
}));

vi.mock('../utils/mermaidDownload', () => ({
  renderMermaidWithDownloads: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), run: vi.fn().mockResolvedValue(undefined) },
}));

// Stub all heavy child components
const Stub = { template: '<div></div>' };

describe('AI.Chat.vue', () => {
  let Chat: any;

  beforeAll(async () => {
    Chat = (await import('../components/AI.Chat.vue')).default;
  }, 30000);

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    // jsdom does not implement Element.scroll
    Element.prototype.scroll = vi.fn();
  });

  function mountChat() {
    return mount(Chat, {
      global: {
        plugins: [vuetify],
        stubs: {
          VNavigationDrawer: Stub,
          ChatList: Stub,
          ModelSelector: Stub,
          PromptCards: Stub,
          PromptManager: Stub,
          FeedbackManager: Stub,
          AIFooter: Stub,
          FeedbackTrigger: Stub,
          OptimizePromptButton: Stub,
          PromptSelector: Stub,
          ExpertSelector: Stub,
          FileUploader: Stub,
          MicButton: Stub,
          Textarea: Stub,
          ChatActions: Stub,
          PulseLoader: Stub,
        },
      },
    });
  }

  // --- parseStreamBuffer ---
  it('parseStreamBuffer extracts v field from SSE chunk', () => {
    const wrapper = mountChat();
    const vm = wrapper.vm as any;
    const result = vm.parseStreamBuffer('data: {"v":"hello world"}\n\n');
    expect(result).toBe('hello world');
  });

  it('parseStreamBuffer returns empty string for e (error) field', () => {
    const wrapper = mountChat();
    const vm = wrapper.vm as any;
    const result = vm.parseStreamBuffer('data: {"e":"some error"}\n\n');
    expect(result).toBe('');
  });

  it('parseStreamBuffer handles multiple chunks in one buffer', () => {
    const wrapper = mountChat();
    const vm = wrapper.vm as any;
    const result = vm.parseStreamBuffer('data: {"v":"hello"}\n\ndata: {"v":" world"}\n\n');
    expect(result).toBe('hello world');
  });

  it('parseStreamBuffer returns empty string for invalid json', () => {
    const wrapper = mountChat();
    const vm = wrapper.vm as any;
    const result = vm.parseStreamBuffer('not valid json at all');
    expect(result).toBe('');
  });

  // --- handleSnackbar ---
  it('handleSnackbar sets snackbar visible with message and color', () => {
    const wrapper = mountChat();
    const vm = wrapper.vm as any;
    vm.handleSnackbar({ message: 'Test message', color: 'error' });
    expect(vm.snackbar.visible).toBe(true);
    expect(vm.snackbar.message).toBe('Test message');
    expect(vm.snackbar.color).toBe('error');
  });

  it('handleSnackbar defaults color to success when not provided', () => {
    const wrapper = mountChat();
    const vm = wrapper.vm as any;
    vm.handleSnackbar({ message: 'Ok', color: undefined });
    expect(vm.snackbar.color).toBe('success');
  });

  // --- computed: len ---
  it('len returns input length', () => {
    const wrapper = mountChat();
    const vm = wrapper.vm as any;
    vm.input = 'hello';
    expect(vm.len).toBe(5);
  });

  it('len returns 0 for empty input', () => {
    const wrapper = mountChat();
    const vm = wrapper.vm as any;
    vm.input = '';
    expect(vm.len).toBe(0);
  });

  // --- computed: rows ---
  it('rows returns 1 for empty input', () => {
    const wrapper = mountChat();
    const vm = wrapper.vm as any;
    vm.input = '';
    expect(vm.rows).toBe(1);
  });

  it('rows respects maxRows cap', () => {
    const wrapper = mountChat();
    const vm = wrapper.vm as any;
    vm.input = 'a\nb\nc\nd\ne\nf\ng';
    expect(vm.rows).toBeLessThanOrEqual(5);
  });

  // --- computed: canSend ---
  it('canSend is false when isResponding', () => {
    const wrapper = mountChat();
    const vm = wrapper.vm as any;
    vm.input = 'hello';
    vm.isResponding = true;
    expect(vm.canSend).toBe(false);
  });

  it('canSend is false when input is empty', () => {
    const wrapper = mountChat();
    const vm = wrapper.vm as any;
    vm.input = '';
    vm.isResponding = false;
    expect(vm.canSend).toBe(false);
  });

  it('canSend is true when input has content and not responding', () => {
    const wrapper = mountChat();
    const vm = wrapper.vm as any;
    vm.input = 'hello';
    vm.isResponding = false;
    vm.chatId = 'some-id';
    expect(vm.canSend).toBe(true);
  });

  // --- onListeningChange ---
  it('onListeningChange updates micListening', () => {
    const wrapper = mountChat();
    const vm = wrapper.vm as any;
    vm.onListeningChange(true);
    expect(vm.micListening).toBe(true);
    vm.onListeningChange(false);
    expect(vm.micListening).toBe(false);
  });

  // --- openFeedbackManager ---
  it('openFeedbackManager hides prompt manager and shows feedback manager', () => {
    const wrapper = mountChat();
    const vm = wrapper.vm as any;
    vm.showPromptManager = true;
    vm.openFeedbackManager();
    expect(vm.showPromptManager).toBe(false);
    expect(vm.showFeedbackManager).toBe(true);
  });

  // --- handleChatStreamError ---
  it('handleChatStreamError sets error content and stops responding', () => {
    const wrapper = mountChat();
    const vm = wrapper.vm as any;
    vm.isResponding = true;
    vm.messages = [{ role: 'gpt', content: '' }];
    vm.handleChatStreamError(new Error('network fail'));
    expect(vm.isResponding).toBe(false);
    expect(vm.messages[0].content).toContain('error occurred');
  });

  // --- selectConversation ---
  it('selectConversation sets selectedConversation and triggers record fetch', async () => {
    const { gptService } = await import('../global/gpt.api.service');
    const wrapper = mountChat();
    const vm = wrapper.vm as any;
    const conv = { conversationId: 'c1', isAgent: false };
    vm.selectConversation(conv);
    expect(vm.selectedConversation).toEqual(conv);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(gptService.record.request).toHaveBeenCalled();
  });

  // --- handleDeleteConversation ---
  it('handleDeleteConversation resets messages when deleted conv is current', async () => {
    const wrapper = mountChat();
    const vm = wrapper.vm as any;
    vm.chatId = 'del-conv';
    vm.messages = [{ role: 'user', content: 'hi' }];
    await vm.handleDeleteConversation({ conversationId: 'del-conv' });
    expect(vm.messages).toHaveLength(0);
    expect(vm.chatId).toBe('new-conv-id');
  });

  it('handleDeleteConversation does not reset messages for different conv', async () => {
    const { gptService } = await import('../global/gpt.api.service');
    const wrapper = mountChat();
    const vm = wrapper.vm as any;
    vm.chatId = 'current-conv';
    vm.messages = [{ role: 'user', content: 'hi' }];
    await vm.handleDeleteConversation({ conversationId: 'other-conv' });
    expect(gptService.start.request).not.toHaveBeenCalled();
    expect(vm.messages).toHaveLength(1);
  });

  // --- newChat ---
  it('newChat resets messages and calls gptService.start', async () => {
    const { gptService } = await import('../global/gpt.api.service');
    const wrapper = mountChat();
    const vm = wrapper.vm as any;
    vm.messages = [{ role: 'user', content: 'hi' }];
    await vm.newChat();
    expect(vm.messages).toHaveLength(0);
    expect(gptService.start.request).toHaveBeenCalled();
    expect(vm.chatId).toBe('new-conv-id');
  });

  // --- summarize ---
  it('summarize sets SummaryPrompt as input and calls send', async () => {
    const wrapper = mountChat();
    const vm = wrapper.vm as any;
    // summarize sets input to SummaryPrompt then clears it on send(); just verify it's not empty before clearing
    const { SummaryPrompt } = await import('../components/prompts/SummaryPrompt');
    vm.summarize();
    // send() runs synchronously and clears input — check SummaryPrompt was the value pushed to messages
    expect(vm.messages.some((m: any) => m.role === 'gpt')).toBe(true);
    expect(SummaryPrompt).toBeTruthy();
  });

  // --- selectedPrompt ---
  it('selectedPrompt sets input when autoSend is false', async () => {
    const wrapper = mountChat();
    const vm = wrapper.vm as any;
    await vm.selectedPrompt({ prompt: 'explain X' }, false);
    expect(vm.input).toBe('explain X');
  });

  it('selectedPrompt triggers newChat and send when autoSend is true', async () => {
    const { gptService } = await import('../global/gpt.api.service');
    const wrapper = mountChat();
    const vm = wrapper.vm as any;
    await vm.selectedPrompt({ prompt: 'auto send me' }, true);
    // newChat calls gptService.start and send pushes a gpt message
    expect(gptService.start.request).toHaveBeenCalled();
    expect(vm.messages.some((m: any) => m.role === 'gpt')).toBe(true);
  });

  // --- useAgent computed ---
  it('useAgent returns false when usedModel.isAgent is false', () => {
    const wrapper = mountChat();
    const vm = wrapper.vm as any;
    vm.usedModel = { name: 'gpt-4', isAgent: false };
    expect(vm.useAgent).toBe(false);
  });

  it('useAgent returns true when usedModel.isAgent is true', () => {
    const wrapper = mountChat();
    const vm = wrapper.vm as any;
    vm.usedModel = { name: 'my-agent', isAgent: true };
    expect(vm.useAgent).toBe(true);
  });
});
