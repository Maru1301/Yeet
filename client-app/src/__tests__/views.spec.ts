import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

const vuetify = createVuetify({ components, directives });

const mockRouterPush = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

// ---- Auth.vue ----
describe('Auth.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('displays noAuthMessage from store', async () => {
    const { default: Auth } = await import('../views/Auth.vue');
    const { useAppStore } = await import('../store/index');
    const store = useAppStore();
    store.$patch({ noAuthMessage: 'Access denied for testing' });

    const wrapper = mount(Auth, { global: { plugins: [vuetify] } });
    expect(wrapper.text()).toContain('Access denied for testing');
  });

  it('displays default noAuthMessage', async () => {
    const { default: Auth } = await import('../views/Auth.vue');
    const wrapper = mount(Auth, { global: { plugins: [vuetify] } });
    expect(wrapper.text()).toContain('No permission to access');
  });
});

// ---- BrowserNotSupport.vue ----
describe('BrowserNotSupport.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('redirects to home when not IE on mount', async () => {
    // Non-IE: ActiveXObject must not exist at all ('in window' check must return false)
    if ('ActiveXObject' in window) {
      const desc = Object.getOwnPropertyDescriptor(window, 'ActiveXObject');
      if (desc?.configurable) delete window.ActiveXObject;
    }

    const { default: BrowserNotSupport } = await import('../views/BrowserNotSupport.vue');
    mount(BrowserNotSupport, { global: { plugins: [vuetify] } });
    await new Promise(r => setTimeout(r, 0));

    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'home' });
  });

  it('stays on page when IS IE (ActiveXObject present)', async () => {
    Object.defineProperty(window, 'ActiveXObject', { value: function () { }, writable: true, configurable: true });

    const { default: BrowserNotSupport } = await import('../views/BrowserNotSupport.vue');
    mount(BrowserNotSupport, { global: { plugins: [vuetify] } });
    await new Promise(r => setTimeout(r, 0));

    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});

// ---- Err.vue ----
describe('Err.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('navigates to home when Go home button is clicked', async () => {
    const { default: Err } = await import('../views/Err.vue');
    const wrapper = mount(Err, { global: { plugins: [vuetify] } });

    await wrapper.find('.homeBtn').trigger('click');
    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'home' });
  });

  it('renders Go home button', async () => {
    const { default: Err } = await import('../views/Err.vue');
    const wrapper = mount(Err, { global: { plugins: [vuetify] } });
    expect(wrapper.find('.homeBtn').exists()).toBe(true);
  });
});
