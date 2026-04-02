import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import App from '../App.vue';

// Stub Kingston globals
vi.stubGlobal('LittleKing', class {
  constructor(_opts: unknown) {}
  init() {}
});
vi.stubGlobal('ENV', 'Local');
vi.stubGlobal('SYSTEM', 'TEST');

const vuetify = createVuetify({ components, directives });

async function mountApp(userAuth: unknown = null, search = '') {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, search },
    writable: true,
    configurable: true,
  });

  const pinia = createPinia();
  setActivePinia(pinia);

  // Pre-seed the store state
  const app = mount(App, {
    global: {
      plugins: [vuetify, pinia],
      stubs: { RouterView: true },
    },
  });

  if (userAuth !== null) {
    const { useAppStore } = await import('../store/index');
    useAppStore().$patch({ userAuth });
  }

  return app;
}

describe('App.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('shows loading spinner when userAuth is null', async () => {
    const wrapper = await mountApp(null);
    expect(wrapper.find('.loading').exists()).toBe(true);
  });

  it('shows loading spinner when hasSSOQuery contains accountToken', async () => {
    const wrapper = await mountApp('someUser', '?accountToken=abc');
    expect(wrapper.find('.loading').exists()).toBe(true);
  });

  it('shows loading spinner when hasSSOQuery contains adAccount', async () => {
    const wrapper = await mountApp('someUser', '?adAccount=abc');
    expect(wrapper.find('.loading').exists()).toBe(true);
  });

  it('shows loading spinner when hasSSOQuery contains easToken', async () => {
    const wrapper = await mountApp('someUser', '?easToken=abc');
    expect(wrapper.find('.loading').exists()).toBe(true);
  });

  it('renders router-view when userAuth is set and no SSO query', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    Object.defineProperty(window, 'location', { value: { search: '' }, writable: true });

    const wrapper = mount(App, {
      global: {
        plugins: [vuetify, pinia],
        stubs: { RouterView: true },
      },
    });

    const { useAppStore } = await import('../store/index');
    useAppStore().$patch({ userAuth: { name: 'testUser' } });
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="main-content"]').exists()).toBe(true);
  });

  it('calls littleKing.init on mount', () => {
    const initSpy = vi.fn();
    vi.stubGlobal('LittleKing', class {
      constructor(_opts: unknown) {}
      init = initSpy;
    });

    const pinia = createPinia();
    setActivePinia(pinia);
    mount(App, {
      global: { plugins: [vuetify, pinia], stubs: { RouterView: true } },
    });

    expect(initSpy).toHaveBeenCalled();
  });
});
