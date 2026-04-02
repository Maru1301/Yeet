<template>
  <div class="authPage">
    <div class="logoWrap">
      <div class="txt">AI Chat</div>
    </div>
    <div class="authWrap">
      <v-app class="authApp">
        <div class="authAppWrap">
          <v-container fluid>
            <img class="stop" src="assets/noAuth.svg" alt="STOP">
            <div class="description">{{ noAuthMessage }}</div>
          </v-container>
        </div>
      </v-app>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useAppStore } from '../store/index';

const store = useAppStore();
const { noAuthMessage } = storeToRefs(store);
</script>

<style lang="scss">
@use '../styles/variables' as *;

.authPage {
  position: relative;
  width: 100%;
  height: 100vh;
  background-color: $Kingston_GenerativeAI_DarkBg;
  overflow: hidden;
  @media screen and (min-width: $lg) {
    background: $Kingston_GenerativeAI_DarkBg;
  }

  .logoWrap {
    position: absolute;
    bottom: 10px;
    width: 100%;
    @media screen and (min-width: $lg) {
      top: 30px;
      left: 30px;
      bottom: inherit;
    }
    .logo {
      float: left;
      display: block;
      width: 37px;
      margin: 0 auto;
      @media screen and (min-width: $lg) {
        margin: 0;
      }
    }
    .txt {
      float: left;
      margin-left: 10px;
      margin-top: 3px;
      font-size: 24px;
      color: $Kingston_White;
    }
  }

  .authWrap {
    width: 300px;
    margin: 0 auto;
    @media screen and (min-width: $sm) {
      width: 400px;
      margin: 5vh auto 0 auto;
    }

    .authApp {
      background-color: transparent;
      display: flex;
      align-items: center;
      justify-content: center;

      .authAppWrap {
        width: 100%;
        min-height: 100vh;
        display: flex;
        align-content: center;
      }

      .stop {
        display: block;
        width: 200px;
        height: 200px;
        margin: 100px auto 100px auto;
        @media screen and (min-width: $lg) {
          width: 300px;
          height: 300px;
        }
      }

      .description {
        font-size: 18px;
        color: $Kingston_White;
        text-align: center;
        font-weight: bold;
        margin-bottom: 20px;
      }
    }
  }
}
</style>
