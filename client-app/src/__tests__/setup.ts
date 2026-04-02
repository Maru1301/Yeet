// Polyfill ResizeObserver for JSDOM (required by Vuetify's VApp layout)
if (typeof ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Polyfill visualViewport for JSDOM (required by Vuetify's overlay/menu positioning)
if (typeof window.visualViewport === 'undefined') {
  Object.defineProperty(window, 'visualViewport', {
    value: {
      width: 1024,
      height: 768,
      offsetLeft: 0,
      offsetTop: 0,
      pageLeft: 0,
      pageTop: 0,
      scale: 1,
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    configurable: true,
  });
}
