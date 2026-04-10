<template>
  <v-app>
    <v-main class="chat-bg"
            v-if="!hasSSOQuery">
      <v-progress-circular color="primary"
                           indeterminate
                           class="loading"></v-progress-circular>
    </v-main>

    <v-main class="chat-bg"
            v-else
            data-testid="main-content">
      <router-view></router-view>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useTheme } from 'vuetify';
import { useAppStore } from './store/index';
import hljsLightUrl from 'highlight.js/styles/github.css?url';
import hljsDarkUrl from 'highlight.js/styles/github-dark.css?url';
import yeetDarkPng from './assets/yeet_pic/yeet_dark.png';
import yeetLightPng from './assets/yeet_pic/yeet_light.png';

const store = useAppStore();
// const { userAuth } = storeToRefs(store);
const router = useRouter();
const vuetifyTheme = useTheme();

// Dynamically switch highlight.js theme stylesheet
let hljsLink: HTMLLinkElement | null = null;

function applyHljsTheme(isDark: boolean) {
  if (!hljsLink) {
    hljsLink = document.createElement('link');
    hljsLink.rel = 'stylesheet';
    document.head.appendChild(hljsLink);
  }
  hljsLink.href = isDark ? hljsDarkUrl : hljsLightUrl;
}

function applyFavicon(isDark: boolean) {
  let faviconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!faviconLink) {
    faviconLink = document.createElement('link');
    faviconLink.rel = 'icon';
    faviconLink.type = 'image/png';
    document.head.appendChild(faviconLink);
  }
  faviconLink.href = isDark ? yeetLightPng : yeetDarkPng;
}

applyHljsTheme(vuetifyTheme.global.name.value === 'dark');
applyFavicon(vuetifyTheme.global.name.value === 'dark');

watch(vuetifyTheme.global.name, (newTheme) => {
  localStorage.setItem('theme', newTheme);
  applyHljsTheme(newTheme === 'dark');
  applyFavicon(newTheme === 'dark');
});

// const query = Object.fromEntries(new URLSearchParams(location.search)) as Record<string, string>;
// const hasSSOQuery = Boolean(query.accountToken || query.adAccount || query.easToken);
const hasSSOQuery: boolean = true;

async function checkBrowser() {
  // IE 不給用
  if (!!window.ActiveXObject || 'ActiveXObject' in window) {
    // 跳轉'BrowserNotSupport'頁面
    router.push({ name: 'browser_not_support' });
  }
}

onMounted(() => {
  // 檢查瀏覽器版本
  checkBrowser();
});
</script>

<style lang="scss">
.chat-bg {
  .loading {
    margin-top: calc(50vh - 20px);
    margin-left: calc(50vw - 20px);
  }
}
</style>
