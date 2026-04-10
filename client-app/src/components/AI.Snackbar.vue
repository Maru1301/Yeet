<template>
  <v-snackbar v-model="snackbar.visible"
              :color="snackbar.color"
              location="top right"
              timeout="8000">
    {{ snackbar.message }}
    <template v-if="snackbar.action"
              #actions>
      <v-btn variant="text"
             @click="snackbar.action?.()">{{ snackbar.actionText }}</v-btn>
    </template>
  </v-snackbar>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface SnackbarState {
  visible: boolean;
  message: string;
  color: string;
  actionText: string;
  action: (() => void) | null;
}

const snackbar = ref<SnackbarState>({ visible: false, message: '', color: 'success', actionText: '', action: null });

function show(message: string, color: string, actionText = '', action: (() => void) | null = null) {
  snackbar.value = { visible: true, message, color, actionText, action };
}

defineExpose({ show });
</script>
