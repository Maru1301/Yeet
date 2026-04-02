<template>
  <v-app class="browserNotSupport">
    <v-container>
      <div class="text-center mainTitle">Browser not supported</div>
      <div class="text-center mainDetail">Please use Edge or Chrome</div>
      <div class="browserIconWrap">
        <v-row no-gutters>
          <v-col>
            <img class="browserIcon Edge"
                 src="assets/EdgeLogo.svg"
                 alt="Please use Edge or Chrome" />
          </v-col>
          <v-col>
            <img class="browserIcon Chrome"
                 src="assets/ChromeLogo.svg"
                 alt="Please use Edge or Chrome" />
          </v-col>
        </v-row>
      </div>
    </v-container>
  </v-app>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

onMounted(() => {
  // 是 IE 自動跳回首頁
  if (!(!!window.ActiveXObject || 'ActiveXObject' in window)) {
    router.push({ name: 'home' });
  }
});
</script>

<style lang="scss">
@use '../styles/variables' as *;

.browserNotSupport.v-application {
  background-color: $Kingston_GenerativeAI_DarkBg;

  .mainTitle {
    color: $Kingston_White;
    font-weight: bold;
    font-size: 36px;
    margin-top: 150px;
    margin-bottom: 8px;
  }

  .mainDetail {
    color: $Kingston_White;
    font-size: 26px;
    margin-bottom: 50px;
  }

  .browserIconWrap {
    width: 350px;
    margin: 0 auto;

    .browserIcon {
      display: block;
      width: 150px;
      margin: 0 auto;

      &.Edge {
        margin-left: 0;
      }

      &.Chrome {
        margin-right: 0;
      }
    }
  }

}
</style>
