<template>
  <v-menu v-model="menu"
          :close-on-content-click="false"
          location="top"
          :offset="[10, 80]">
    <template #activator="{ props: menuProps }">
      <v-tooltip content-class="bg-blue-lighten-1"
                 location="bottom">
        <template #activator="{ props: tooltipProps }">
          <v-btn v-bind="{ ...menuProps, ...tooltipProps }"
                 icon
                 variant="text"
                 size="small"
                 class="functionalBtn"
                 color="blue-lighten-2"
                 :ripple="false">
            <v-icon class="btn-icon-blue">mdi-account-group</v-icon>
          </v-btn>
        </template>
        <span>Experts</span>
      </v-tooltip>
    </template>

    <v-card class="mx-auto"
            max-width="500"
            width="500"
            rounded="lg">
      <v-toolbar flat>
        <v-btn icon="mdi-arrow-left"
               variant="text"
               color="#B0B3B8"
               @click="menu = false" />
        <v-text-field v-model="search"
                      label="Search Experts"
                      variant="underlined"
                      hide-details
                      clearable
                      prepend-inner-icon="mdi-magnify"
                      class="flex-grow-1 mr-5 mb-5"
                      @click.stop />
      </v-toolbar>

      <v-virtual-scroll v-if="searching.length > 0"
                        :items="searching"
                        :height="300"
                        item-height="80">
        <template #default="{ item }">
          <v-list-item :key="item.title"
                       class="py-2 "
                       @click="itemClick(item)">
            <template #prepend>
              <v-img :src="resolveImage(item.image)"
                     width="80"
                     height="80"
                     cover
                     class="mr-4 rounded" />
            </template>
            <v-list-item-title class="text-subtitle-2 text-uppercase ">
              {{ item.category }}
            </v-list-item-title>
            <v-list-item-subtitle class="text-body-2 ">
              {{ item.title }}
            </v-list-item-subtitle>
          </v-list-item>
          <v-divider color="#353945" />
        </template>
      </v-virtual-scroll>

      <div v-else
           class="d-flex flex-column align-center justify-center pa-5"
           style="height: 300px;">
        <v-icon size="64"
                color="#353945"
                class="mb-4">mdi-account-search</v-icon>
        <v-card-title class="text-h6 text-center ">No Experts Found</v-card-title>
        <v-card-subtitle class="text-body-2 text-center">
          Try searching with different keywords
        </v-card-subtitle>
      </div>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ExpertPrompts, type ExpertPrompt } from './prompts/ExpertPrompts';
import { enhancePromptWithFormatting } from './prompts/PromptUtils';

const emit = defineEmits<{
  (e: 'selected', item: ExpertPrompt & { prompt: string; }, autoSend: boolean): void;
}>();

const prompts = ExpertPrompts;
const search = ref('');
const menu = ref(false);

const searching = computed(() => {
  const s = search.value.trim().toLowerCase();
  if (!s) return prompts;
  return prompts.filter(item =>
    item.title.toLowerCase().includes(s) || item.category.toLowerCase().includes(s)
  );
});

const imageModules = import.meta.glob('../assets/*.{png,jpg,jpeg,svg,gif,webp}', {
  eager: true,
  import: 'default'
});

const images: Record<string, string> = Object.fromEntries(
  Object.entries(imageModules).map(([path, mod]) => [path.split('/').pop() ?? '', mod as string])
);

function resolveImage(name: string): string {
  if (!name) return '';
  return images[name] ?? '';
}

function itemClick(item: ExpertPrompt) {
  const enhancedItem = {
    ...item,
    prompt: enhancePromptWithFormatting(item.prompt),
  };
  emit('selected', enhancedItem, true);
  menu.value = false;
}
</script>