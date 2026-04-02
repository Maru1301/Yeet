import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';
import customConfig from './vue.allVar';


export default defineConfig(({ mode }) => {
  let nowConfig = customConfig.Local;

  switch (mode) {
    case 'Debug':
      nowConfig = customConfig.Debug;
      break;
    case 'QAS':
      nowConfig = customConfig.QAS;
      break;
    case 'Release':
      nowConfig = customConfig.Release;
      break;
  }

  console.log('vite.config.ts ENV use:', nowConfig.env);

  const isQAS = mode === 'QAS';

  return {
    plugins: [
      vue(),
      vuetify({ autoImport: true }),
      basicSsl(),
    ],

    resolve: {
      alias: {
        assets: path.resolve(__dirname, './src/assets/'),
      },
    },

    define: {
      ROOT_FOLDER: nowConfig.rootFolder,
      PROXY_API_URL: nowConfig.proxyApiUrl,
      ENV: nowConfig.env,
    },

    server: {
      port: 44493,
      proxy: {
        '/chat': { target: 'http://localhost:8080', changeOrigin: true },
        '/agent': { target: 'http://localhost:8080', changeOrigin: true },
      },
      compress: false,
    },

    build: {
      outDir: 'dist',
      // QAS builds must not wipe dist because build:QAS_Release runs both concurrently
      emptyOutDir: !isQAS,
      rollupOptions: {
        input: path.resolve(__dirname, isQAS ? 'index.qas.html' : 'index.html'),
      },
    },

    base: nowConfig.sourcePublicPath,

    // Vitest configuration
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/__tests__/setup.ts'],
      server: {
        deps: {
          inline: ['vuetify'],
        },
      },
    },
  };
});
