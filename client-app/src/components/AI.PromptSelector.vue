<template>
  <v-menu v-model="menu"
          :close-on-content-click="false"
          location="top"
          :offset="[10, 40]">
    <template #activator="{ props: menuProps }">
      <v-tooltip content-class="bg-purple-lighten-1"
                 location="bottom">
        <template #activator="{ props: tooltipProps }">
          <v-btn v-bind="{ ...menuProps, ...tooltipProps }"
                 icon
                 variant="text"
                 class="functionalBtn"
                 size="small"
                 :ripple="false">
            <v-icon class="btn-icon-purple">mdi-bookmark</v-icon>
          </v-btn>
        </template>
        <span>Prompts</span>
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
                      placeholder="Search Prompts..."
                      hide-details
                      variant="solo"
                      rounded="xl"
                      bg-color="#e8eaf6"
                      class="mr-2 pm-search-field"
                      style="flex: 1 1 0; min-width: 0;"
                      density="compact"
                      clearable
                      flat
                      @click.stop>
          <template v-slot:prepend-inner>
            <v-icon class="search-icon">mdi-magnify</v-icon>
          </template>
        </v-text-field>
        <v-btn variant="flat"
               height="38"
               rounded="pill"
               class="edit-red-btn flex-shrink-0 mr-2"
               min-width="80px"
               @click="openManager">
          <v-icon color="#DB2627">mdi-pencil</v-icon>
          EDIT
        </v-btn>
      </v-toolbar>

      <v-list density="comfortable"
              style="max-height: 200px;"
              class="pm-list overflow-y-auto mt-2"
              lines="two">
        <template v-if="filtered.length">
          <v-list-item v-for="item in filtered"
                       :key="item.id"
                       class="pm-list-item compact-item"
                       @click="pick(item)">
            <template #prepend>
              <v-avatar class="pm-avatar"
                        rounded="lg">
                <v-icon size="25"
                        color="#3f51b5">{{ getIconType(item) }}</v-icon>
              </v-avatar>
            </template>
            <v-list-item-title class="font-weight-medium mb-1">
              {{ item.title ? item.title : 'New Title - Please enter a title.' }}
            </v-list-item-title>
            <v-list-item-subtitle>
              {{ item.prompt ? oneLine(item.prompt) : 'New Prompt - Please enter prompt content.' }}
            </v-list-item-subtitle>
          </v-list-item>
        </template>
        <div v-else
             class="d-flex flex-column align-center justify-center py-3">
          <v-icon size="48"
                  color="grey-lighten-2">mdi-bookmark-outline</v-icon>
          <div class="text-h5 text-grey-darken-1 text-center mt-2 mb-1">No Prompts Yet</div>
          <div class="text-body-2 text-grey-darken-2 text-center">
            Click the "EDIT" button to create your first prompt
          </div>
        </div>
      </v-list>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import * as store from './prompts/PromptStore';
import type { Prompt } from './prompts/PromptStore';

const emit = defineEmits<{
  (e: 'selected', item: { title: string; prompt: string; }): void;
  (e: 'edit'): void;
}>();

const menu = ref(false);
const search = ref('');
const prompts = ref<Prompt[]>([]);

const filtered = computed(() => {
  const s = (search.value || '').toLowerCase();
  return prompts.value
    .filter(p => !s || p.title.toLowerCase().includes(s) || p.prompt.toLowerCase().includes(s) || (p.tags || []).some(t => String(t).toLowerCase().includes(s)))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt - a.updatedAt);
});

async function reload() {
  prompts.value = await store.list();
}

function openManager() {
  emit('edit');
  menu.value = false;
}

function oneLine(txt: string): string {
  return (txt || '').replace(/\s+/g, ' ').trim().slice(0, 160);
}

function pick(item: Prompt) {
  emit('selected', { title: item.title, prompt: item.prompt });
  menu.value = false;
}

function getIconType(item: Prompt): string {
  return item.favorite ? 'mdi-star' : 'mdi-bookmark';
}

onMounted(async () => {
  await reload();
});
</script>

<style lang="scss">
.v-theme--dark {
  .pm-search-field .v-field {
    background: #353945 !important;
  }
}

.pm-search-field input::placeholder {
  color: #9e9e9e;
  opacity: 1;
}

.v-theme--dark .pm-search-field input::placeholder {
  color: white;
}
</style>
