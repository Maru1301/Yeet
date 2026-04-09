<template>
  <div v-if="store.entries.length > 0"
       class="outline-strip">
    <v-btn density="compact" class="outline-btn px-0"
      @click="emit('up')">
      <v-icon size="x-large">mdi-menu-up</v-icon>
    </v-btn>
    <v-tooltip v-for="entry in store.entries"
               :key="entry.index"
               :text="entry.label === '[media]' ? '(media)' : entry.label"
               location="left"
               content-class="outline-tooltip">
      <template v-slot:activator="{ props: tp }">
        <div v-bind="tp"
             class="outline-line"
             :class="{
               'outline-line--user': entry.role === 'user',
               'outline-line--assistant': entry.role === 'assistant',
               'outline-line--active': entry.index === store.activeIndex,
             }"
             @click="emit('navigate', entry.index)" />
      </template>
    </v-tooltip>
    <v-btn density="compact" class="outline-btn px-0"
      @click="emit('down')">
      <v-icon size="x-large">mdi-menu-down</v-icon>
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { useOutlineStore } from '../store/outline';

const store = useOutlineStore();

const emit = defineEmits<{
  navigate: [index: number];
  up: [];
  down: [];
}>();
</script>

<style lang="scss" scoped>
.outline-strip {
  position: absolute;
  right: 6px;
  top: calc(50% - 72px);
  transform: translateY(-50%);
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 16px;
  padding: 10px 3px;
  pointer-events: none;
  max-height: 70%;
  overflow: hidden;
}

.outline-btn {
  cursor: pointer;
  pointer-events: auto;
}

.outline-line {
  flex-shrink: 0;
  height: 4px;
  width: 14px;
  border-radius: 2px;
  cursor: pointer;
  pointer-events: auto;
  background: rgba(var(--v-theme-on-surface), 0.18);
  transition: width 100ms ease, height 100ms ease, background 100ms ease;

  &:hover {
    width: 20px;
    height: 6px;
    background: rgba(var(--v-theme-on-surface), 0.45);
  }

  &--user {
    width: 24px;
    background: rgba(var(--v-theme-primary), 0.5);

    &:hover {
      width: 28px;
      background: rgba(var(--v-theme-primary), 0.85);
    }
  }

  &--assistant {
    width: 36px;
    background: rgba(var(--v-theme-on-surface), 0.28);

    &:hover {
      width: 40px;
      background: rgba(var(--v-theme-on-surface), 0.55);
    }
  }

  &--active {
    height: 6px;
    border-radius: 3px;

    &.outline-line--user    { 
      width: 28px;
      background: rgb(var(--v-theme-primary)) !important;
    }
    &.outline-line--assistant { 
      width: 40px;
      background: rgba(var(--v-theme-on-surface))!important; 
    }
  }
}

.outline-tooltip {
  font-size: 12px;
  max-width: 280px;
  white-space: normal;
  line-height: 1.4;
}
</style>
