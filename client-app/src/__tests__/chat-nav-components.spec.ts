import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

const vuetify = createVuetify({ components, directives });

// Mock globals
vi.stubGlobal('ROOT_FOLDER', '/app');

vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({
    params: {},
    query: {},
  })),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

vi.mock('../global/gpt.api.service', () => ({
  gptService: {
    conversationList: {
      request: vi.fn().mockResolvedValue({
        data: [
          { conversationId: 'conv-1', topic: 'First Chat', createdAt: new Date().toISOString(), isAgent: false },
          { conversationId: 'conv-2', topic: 'Second Chat', createdAt: new Date(Date.now() - 86400000).toISOString(), isAgent: true },
        ],
      }),
    },
    deleteRecord: {
      request: vi.fn().mockResolvedValue({}),
    },
  },
}));

import ChatActions from '../components/AI.ChatActions.vue';
import ChatList from '../components/AI.ChatList.vue';

// VNavigationDrawer requires Vuetify layout context — stub it for unit tests
const NavigationDrawerStub = { template: '<div><slot /></div>' };

// ---- AI.ChatActions.vue ----
describe('AI.ChatActions.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  function mountActions(props = {}) {
    return mount(ChatActions, {
      global: { plugins: [vuetify] },
      props: {
        chatId: 'chat-123',
        message: { markdownContent: 'Hello world' },
        department: 'MIS',
        useAgent: false,
        ...props,
      },
    });
  }

  it('renders share and copy buttons', () => {
    const wrapper = mountActions();
    const btns = wrapper.findAll('button');
    expect(btns.length).toBeGreaterThanOrEqual(2);
  });

  it('getFullPath returns correct URL with department', () => {
    const wrapper = mountActions({ department: 'MIS' });
    const vm = wrapper.vm as any;
    const path = vm.getFullPath('chat-123');
    expect(path).toContain('record/MIS');
    expect(path).toContain('conversationId=chat-123');
    expect(path).toContain('isAgent=false');
  });

  it('getFullPath uses "record" when no department', () => {
    const wrapper = mountActions({ department: undefined });
    const vm = wrapper.vm as any;
    const path = vm.getFullPath('chat-abc');
    expect(path).toContain('/record?');
    expect(path).not.toContain('record/');
  });

  it('getFullPath includes useAgent=true when useAgent prop is true', () => {
    const wrapper = mountActions({ useAgent: true });
    const vm = wrapper.vm as any;
    const path = vm.getFullPath('chat-123');
    expect(path).toContain('isAgent=true');
  });

  it('copyFullPath writes to clipboard and shows tooltip', async () => {
    const wrapper = mountActions();
    const vm = wrapper.vm as any;
    await vm.copyFullPath('chat-123');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('chat-123'));
    expect(vm.showShareInfo).toBe(true);
  });

  it('copyContent writes markdown content to clipboard', async () => {
    const wrapper = mountActions();
    const vm = wrapper.vm as any;
    await vm.copyContent('some text');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('some text');
    expect(vm.showCopyInfo).toBe(true);
  });
});

// ---- AI.ChatList.vue ----
describe('AI.ChatList.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  function mountList(props = {}) {
    return mount(ChatList, {
      global: {
        plugins: [vuetify],
        stubs: { VNavigationDrawer: NavigationDrawerStub },
      },
      props: { drawer: true, ...props },
    });
  }

  it('renders New Chat button', () => {
    const wrapper = mountList();
    expect(wrapper.text()).toContain('New Chat');
  });

  it('renders My Prompts button', () => {
    const wrapper = mountList();
    expect(wrapper.text()).toContain('My Prompts');
  });

  it('emits new-chat when New Chat button is clicked', async () => {
    const wrapper = mountList();
    const vm = wrapper.vm as any;
    vm.handleNewChat();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('new-chat')).toBeTruthy();
  });

  it('emits open-prompt-manager when My Prompts is clicked', async () => {
    const wrapper = mountList();
    const vm = wrapper.vm as any;
    vm.handleOpenPromptManager();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('open-prompt-manager')).toBeTruthy();
  });

  it('emits select-conversation when conversation is selected', async () => {
    const wrapper = mountList();
    const vm = wrapper.vm as any;
    const conv = { conversationId: 'x', topic: 'Test' };
    vm.handleSelectConversation(conv);
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('select-conversation')?.[0]?.[0]).toEqual(conv);
  });

  it('emits update:drawer to sync drawer prop', async () => {
    const wrapper = mountList({ drawer: true });
    const vm = wrapper.vm as any;
    vm.drawerValue = false;
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:drawer')?.[0]?.[0]).toBe(false);
  });

  it('groupedConversations returns empty array when conversationList is empty', () => {
    const wrapper = mountList();
    const vm = wrapper.vm as any;
    vm.conversationList = [];
    expect(vm.groupedConversations).toEqual([]);
  });

  it('groupedConversations groups by Today/Yesterday/date', () => {
    const wrapper = mountList();
    const vm = wrapper.vm as any;
    const todayIso = new Date().toISOString();
    const yesterdayIso = new Date(Date.now() - 86400000).toISOString();
    vm.conversationList = [
      { conversationId: 'a', topic: 'A', createdAt: todayIso, isAgent: false },
      { conversationId: 'b', topic: 'B', createdAt: yesterdayIso, isAgent: false },
    ];
    const groups = vm.groupedConversations;
    const labels = groups.map((g: any) => g.dateLabel);
    expect(labels).toContain('Today');
    expect(labels).toContain('Yesterday');
  });

  it('formatTime returns HH:mm wrapped in parentheses', () => {
    const wrapper = mountList();
    const vm = wrapper.vm as any;
    const iso = '2024-01-15T10:30:00Z';
    const result = vm.formatTime(iso);
    expect(result).toMatch(/^\(\d{2}:\d{2}\)$/);
  });

  it('formatTime returns empty string for falsy input', () => {
    const wrapper = mountList();
    const vm = wrapper.vm as any;
    expect(vm.formatTime(null)).toBe('');
    expect(vm.formatTime('')).toBe('');
  });

  it('handleDeleteConversation opens delete dialog', async () => {
    const wrapper = mountList();
    const vm = wrapper.vm as any;
    const conv = { conversationId: 'x', topic: 'Test', createdAt: new Date().toISOString() };
    await vm.handleDeleteConversation(conv);
    expect(vm.deleteDialog).toBe(true);
    expect(vm.selectedConversation).toEqual(conv);
  });

  it('confirmDelete calls deleteRecord.request and removes from list', async () => {
    const { gptService } = await import('../global/gpt.api.service');
    const wrapper = mountList();
    const vm = wrapper.vm as any;
    const conv = { conversationId: 'conv-del', topic: 'Delete Me', createdAt: new Date().toISOString() };
    vm.conversationList = [conv, { conversationId: 'other', topic: 'Keep' }];
    vm.selectedConversation = conv;
    vm.deleteDialog = true;
    await vm.confirmDelete();
    expect(gptService.deleteRecord.request).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'conv-del' })
    );
    expect(vm.conversationList.find((c: any) => c.conversationId === 'conv-del')).toBeUndefined();
    expect(vm.deleteDialog).toBe(false);
  });

  it('getFullPath builds correct share URL', () => {
    const wrapper = mountList();
    const vm = wrapper.vm as any;
    const conv = { conversationId: 'share-1', isAgent: false };
    const path = vm.getFullPath(conv);
    expect(path).toContain('conversationId=share-1');
    expect(path).toContain('isAgent=false');
  });
});
