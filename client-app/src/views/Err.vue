<template>
  <div class="errPage">
    <div class="logoWrap">
      <div class="txt">AI Chat</div>
    </div>
    <div class="authWrap">
      <v-app class="authApp">
        <div class="authAppWrap">
          <v-container fluid>
            <img class="stop" src="assets/err.svg" alt="STOP">
            <div class="description">Something went wrong</div>
            <v-btn variant="elevated" elevation="5" size="large" rounded block class="homeBtn" @click="goHomePath">Go home</v-btn>
          </v-container>
        </div>
      </v-app>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

function goHomePath() {
  router.push({ name: 'home' });
}
</script>

<style lang="scss">
@use '../styles/variables' as *;

.errPage {
  position: relative;
  width: 100%;
  height: 100vh;
  background-color: $color-dark-bg;
  overflow: hidden;
  @media screen and (min-width: $lg) {
    background: $color-dark-bg;
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
      color: $color-white;
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
        width: 250px;
        height: 203px;
        margin: 50px auto 100px auto;
        @media screen and (min-width: $lg) {
          width: 500px;
          height: 325px;
          padding-right: 100px;
        }
      }

      .description {
        font-size: 18px;
        color: $color-white;
        text-align: center;
        font-weight: bold;
        margin-bottom: 20px;
      }

      .homeBtn {
        height: 60px;
        border-radius: 30px;
        background: $color-secondary;
      }
    }
  }
}
</style>
