import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

const vuetify = createVuetify({ components, directives });

vi.mock('../global/gpt.api.service', () => ({
  gptService: {
    ask: {
      request: vi.fn(),
    },
  },
}));

// ---- AI.Footer.vue ----
describe('AI.Footer.vue', () => {
  it('renders KTCFE Copilot text', async () => {
    const { default: Footer } = await import('../components/AI.Footer.vue');
    const wrapper = mount(Footer, { global: { plugins: [vuetify] } });
    expect(wrapper.text()).toContain('KTCFE Copilot');
  });

  it('renders Security & Privacy Policy link', async () => {
    const { default: Footer } = await import('../components/AI.Footer.vue');
    const wrapper = mount(Footer, { global: { plugins: [vuetify] } });
    const links = wrapper.findAll('a');
    expect(links.length).toBeGreaterThanOrEqual(2);
    const policyLink = links.find(l => l.text().includes('Security & Privacy Policy'));
    expect(policyLink).toBeTruthy();
  });
});

// ---- AI.MicButton.vue ----
describe('AI.MicButton.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('shows unsupported tooltip when SpeechRecognition not available', async () => {
    const originalSR = window.SpeechRecognition;
    const originalWSR = window.webkitSpeechRecognition;
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;

    const { default: MicButton } = await import('../components/AI.MicButton.vue');
    const wrapper = mount(MicButton, {
      props: { modelValue: '', disabled: false, maxLen: 100, currentLen: 0 },
      global: { plugins: [vuetify] },
    });

    expect((wrapper.vm as any).tooltipText).toBe('Speech input is not supported in this browser');

    window.SpeechRecognition = originalSR;
    window.webkitSpeechRecognition = originalWSR;
  });

  it('shows voice input tooltip when not listening', async () => {
    (window as any).SpeechRecognition = class { };
    const { default: MicButton } = await import('../components/AI.MicButton.vue');
    const wrapper = mount(MicButton, {
      props: { modelValue: '', disabled: false, maxLen: 100, currentLen: 0 },
      global: { plugins: [vuetify] },
    });
    expect((wrapper.vm as any).tooltipText).toBe('Voice input');
    delete (window as any).SpeechRecognition;
  });

  it('shows stop tooltip when listening', async () => {
    (window as any).SpeechRecognition = class { };
    const { default: MicButton } = await import('../components/AI.MicButton.vue');
    const wrapper = mount(MicButton, {
      props: { modelValue: '', disabled: false, maxLen: 100, currentLen: 0 },
      global: { plugins: [vuetify] },
    });
    (wrapper.vm as any).isListening = true;
    expect((wrapper.vm as any).tooltipText).toBe('Stop voice input');
    delete (window as any).SpeechRecognition;
  });

  it('appendText emits update:modelValue with appended text', async () => {
    const { default: MicButton } = await import('../components/AI.MicButton.vue');
    const wrapper = mount(MicButton, {
      props: { modelValue: 'hello', disabled: false, maxLen: 100, currentLen: 5 },
      global: { plugins: [vuetify] },
    });
    (wrapper.vm as any).appendText('world');
    const emitted = wrapper.emitted('update:modelValue');
    expect(emitted).toBeTruthy();
    expect(emitted![0][0]).toBe('hello world');
  });

  it('appendText slices delta to remaining chars', async () => {
    const { default: MicButton } = await import('../components/AI.MicButton.vue');
    const wrapper = mount(MicButton, {
      props: { modelValue: 'hello', disabled: false, maxLen: 7, currentLen: 5 },
      global: { plugins: [vuetify] },
    });
    // remaining = 7 - 5 = 2, so only 2 chars of "world" are added (plus a space separator)
    // result: 'hello' + ' ' + 'wo' = 'hello wo'
    (wrapper.vm as any).appendText('world');
    const emitted = wrapper.emitted('update:modelValue');
    expect(emitted).toBeTruthy();
    expect(emitted![0][0]).toBe('hello wo');
  });

  it('appendText does not emit when remaining is 0', async () => {
    const { default: MicButton } = await import('../components/AI.MicButton.vue');
    const wrapper = mount(MicButton, {
      props: { modelValue: 'hello', disabled: false, maxLen: 5, currentLen: 5 },
      global: { plugins: [vuetify] },
    });
    (wrapper.vm as any).appendText('world');
    expect(wrapper.emitted('update:modelValue')).toBeFalsy();
  });
});

// ---- AI.OptimizePromptButton.vue ----
describe('AI.OptimizePromptButton.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('parseStreamBuffer extracts v field from stream chunk', async () => {
    const { default: OptBtn } = await import('../components/AI.OptimizePromptButton.vue');
    const wrapper = mount(OptBtn, {
      props: { input: 'test', len: 4, isResponding: false, optimizing: false },
      global: { plugins: [vuetify] },
    });
    const result = (wrapper.vm as any).parseStreamBuffer('data: {"v":"hello"}\n\ndata: {"v":" world"}\n\n');
    expect(result).toBe('hello world');
  });

  it('parseStreamBuffer ignores e (error) field and returns empty', async () => {
    const { default: OptBtn } = await import('../components/AI.OptimizePromptButton.vue');
    const wrapper = mount(OptBtn, {
      props: { input: 'test', len: 4, isResponding: false, optimizing: false },
      global: { plugins: [vuetify] },
    });
    const result = (wrapper.vm as any).parseStreamBuffer('{"e":"some error"}');
    expect(result).toBe('');
  });

  it('button is disabled when len < 1', async () => {
    const { default: OptBtn } = await import('../components/AI.OptimizePromptButton.vue');
    const wrapper = mount(OptBtn, {
      props: { input: '', len: 0, isResponding: false, optimizing: false },
      global: { plugins: [vuetify] },
    });
    const btn = wrapper.findComponent({ name: 'VBtn' });
    expect(btn.props('disabled')).toBe(true);
  });

  it('button is disabled when isResponding is true', async () => {
    const { default: OptBtn } = await import('../components/AI.OptimizePromptButton.vue');
    const wrapper = mount(OptBtn, {
      props: { input: 'hello', len: 5, isResponding: true, optimizing: false },
      global: { plugins: [vuetify] },
    });
    const btn = wrapper.findComponent({ name: 'VBtn' });
    expect(btn.props('disabled')).toBe(true);
  });

  it('optimizePrompt calls gptService.ask.request with correct params', async () => {
    const { gptService } = await import('../global/gpt.api.service');
    const mockReader = { read: vi.fn().mockResolvedValue({ done: true, value: undefined }) };
    const mockResponse = { body: { getReader: () => mockReader } };
    (gptService.ask.request as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    const { default: OptBtn } = await import('../components/AI.OptimizePromptButton.vue');
    const wrapper = mount(OptBtn, {
      props: { input: 'my prompt', len: 9, isResponding: false, optimizing: false },
      global: { plugins: [vuetify] },
    });

    await (wrapper.vm as any).optimizePrompt();

    expect(gptService.ask.request).toHaveBeenCalledWith(
      expect.objectContaining({
        AgentName: expect.any(String),
        Instruction: expect.any(String),
        Message: expect.stringContaining('my prompt'),
      }),
      undefined,
    );
  });
});
