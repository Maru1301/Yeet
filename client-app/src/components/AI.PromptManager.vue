<template>
  <div class="prompt-manager">
    <!-- Header -->
    <div class="prompt-header pa-4">
      <v-btn icon
             variant="plain"
             style="width:28px; height: 28px; min-width: 28px;"
             @click="emit('backToChat')"
             class="mr-2">
        <v-icon color="backBtn">mdi-arrow-left</v-icon>
      </v-btn>
      <span class="text-h6 header-title mr-4">My Prompts</span>
      <v-spacer></v-spacer>
      <v-btn rounded="pill"
             elevation="0"
             min-width="115"
             @click="exportAll"
             class="normal-btn mr-2">
        <v-icon start>mdi-export</v-icon>
        <span>EXPORT</span>
      </v-btn>
      <v-btn rounded="pill"
             elevation="0"
             min-width="115"
             @click="importClick"
             class="normal-btn ml-2">
        <v-icon start>mdi-import</v-icon>
        <span>IMPORT</span>
      </v-btn>
      <input ref="fileInput"
             type="file"
             accept="application/json"
             class="d-none"
             @change="importFile">

    </div>

    <div class="prompt-content pa-4 d-flex justify-center">
      <div class="d-flex height-calc-10 responsive-container">
        <!-- Left Panel -->
        <div class="left-panel pa-4"
             style="width: 50%;">
          <div class="mb-4">
            <span class="section-title">Title</span>
            <v-text-field v-model="form.title"
                          placeholder="Enter your prompt title here..."
                          single-line
                          hide-details
                          variant="solo"
                          flat
                          rounded
                          density="compact"
                          class="mt-3 white-field text-indigo-darken-1"></v-text-field>
          </div>

          <div>
            <span class="section-title">Prompt</span>
            <v-textarea v-model="form.prompt"
                        :disabled="optimizing"
                        placeholder="Enter your prompt content here..."
                        rows="15"
                        no-resize
                        single-line
                        hide-details
                        variant="solo"
                        flat
                        rounded
                        density="compact"
                        clearable
                        class="mt-3 white-field text-indigo-darken-1"></v-textarea>
          </div>

          <div class="d-flex justify-space-between align-center mt-5">
            <div>
              <v-tooltip color="blue-darken-4"
                         location="bottom">
                <template v-slot:activator="{ props: tooltipProps }">
                  <v-btn class="mr-2 functionalBtn"
                         icon
                         variant="plain"
                         size="small"
                         v-bind="tooltipProps"
                         @click="toggleFav(form)">
                    <v-icon v-if="form.favorite"
                            class="fav-icon is-favorite">mdi-star</v-icon>
                    <v-icon v-else
                            class="fav-icon">mdi-star-outline</v-icon>
                  </v-btn>
                </template>
                <span>{{ form.favorite ? 'Unfavorite' : 'Add to Favorites' }}</span>
              </v-tooltip>
              <AIOptimizePromptButton :input="form.prompt"
                                      :len="form.prompt.length"
                                      :isResponding="false"
                                      :useXSmall="false"
                                      v-model:optimizing="optimizing"
                                      @update:input="form.prompt = $event" />
            </div>
            <div class="d-flex">
              <v-btn rounded
                     elevation="0"
                     min-width="80"
                     class="ml-2 px-6 normal-btn"
                     @click="reset">
                RESET
              </v-btn>
              <v-btn rounded
                     elevation="0"
                     class="ml-2 px-6 red-btn"
                     min-width="80"
                     @click="save"
                     :loading="saveLoading">
                SAVE
              </v-btn>
            </div>
          </div>
        </div>

        <!-- Right Panel -->
        <div class="right-panel pa-4"
             style="width: 50%;">
          <span class="section-title">My Lists</span>

          <div class="mt-3 rounded-xl elevation-0 list-section px-2 pt-4 pb-2 height-calc-10"
               style="display: flex; flex-direction: column;">
            <div class="d-flex align-center mb-4 px-3">
              <v-text-field v-model="search"
                            placeholder="Search Prompts..."
                            hide-details
                            variant="solo"
                            rounded="xl"
                            class="mr-2 pm-search-field"
                            density="compact"
                            clearable
                            flat>
                <template v-slot:prepend-inner>
                  <v-icon class="search-icon">mdi-magnify</v-icon>
                </template>
              </v-text-field>
              <v-btn variant="flat"
                     rounded="pill"
                     height="38"
                     min-width="80px"
                     class="add-btn flex-shrink-0 me-4"
                     @click="add">
                <v-icon start>mdi-plus</v-icon>
                ADD
              </v-btn>
            </div>
            <v-list density="comfortable"
                    lines="two"
                    class="pm-list overflow-y-auto"
                    style="min-height: 0;">

              <template v-if="filtered.length">
                <v-list-item v-for="item in filtered"
                             :key="item.id"
                             @click="select(item)"
                             class="pm-list-item compact-item"
                             :class="{ 'is-selected': selected && selected.id === item.id }">
                  <template #prepend>
                    <v-avatar class="pm-avatar"
                              :class="{ 'is-selected': selected && selected.id === item.id }"
                              rounded="lg">
                      <v-icon size="25">{{ getIconType(item) }}</v-icon>
                    </v-avatar>
                  </template>
                  <v-list-item-title class="font-weight-medium mb-1">
                    {{ item.title ? item.title : 'New Title - Please enter a title.' }}
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    {{ item.prompt ? item.prompt : 'New Prompt - Please enter prompt content.' }}
                  </v-list-item-subtitle>
                  <template #append>
                    <div class="d-flex flex-row align-center ga-2">
                      <v-btn icon
                             variant="plain"
                             density="compact"
                             class="item-btn"
                             @click.stop="duplicateItem(item)">
                        <v-icon>mdi-bookmark-multiple-outline</v-icon>
                      </v-btn>
                      <v-btn icon
                             variant="plain"
                             density="compact"
                             class="item-btn"
                             @click.stop="removeItem(item)">
                        <v-icon>mdi-delete-forever</v-icon>
                      </v-btn>
                    </div>
                  </template>
                </v-list-item>
              </template>

              <div v-else
                   class="d-flex flex-column align-center justify-center py-3">
                <v-icon size="48"
                        color="grey-lighten-2">mdi-bookmark-outline</v-icon>
                <div class="text-h5 text-grey-darken-1 text-center mt-2 mb-1">No Prompts Yet</div>
                <div class="text-body-2 text-grey-darken-2 text-center">
                  Click the "ADD" button to create your first prompt
                </div>
              </div>

            </v-list>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import * as store from './prompts/PromptStore';
import type { Prompt } from './prompts/PromptStore';
import AIOptimizePromptButton from './AI.OptimizePromptButton.vue';

interface PromptForm {
  id: string | undefined;
  title: string;
  prompt: string;
  favorite: boolean;
}

const emit = defineEmits<{
  (e: 'backToChat'): void;
}>();

const search = ref('');
const list = ref<Prompt[]>([]);
const selected = ref<Prompt | null>(null);
const form = ref<PromptForm>({ id: undefined, title: '', prompt: '', favorite: false });
const optimizing = ref(false);
const saveLoading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const filtered = computed(() => {
  const s = (search.value || '').toLowerCase();
  return list.value
    .filter(
      p =>
        !s ||
        p.title.toLowerCase().includes(s) ||
        p.prompt.toLowerCase().includes(s)
    )
    .sort(
      (a, b) =>
        Number(b.favorite) - Number(a.favorite) || b.updatedAt - a.updatedAt
    );
});

async function handleUpsertAndSelect(formData: PromptForm) {
  const id = await store.upsert({ ...formData });
  await load();
  const updated = list.value.find(x => x.id === id);
  if (updated) select(updated);
}

async function load() {
  list.value = await store.list();
  if (list.value.length && !selected.value) {
    select(list.value[0]);
  }
}

function select(p: Prompt) {
  selected.value = p;
  form.value = {
    id: p.id,
    title: p.title,
    prompt: p.prompt,
    favorite: !!p.favorite,
  };
}

function reset() {
  if (selected.value && list.value.some(x => x.id === selected.value!.id)) {
    select(selected.value);
  } else {
    form.value = { id: undefined, title: '', prompt: '', favorite: false };
  }
}

async function add() {
  selected.value = null;
  form.value = { id: undefined, title: '', prompt: '', favorite: false };
  await handleUpsertAndSelect(form.value);
}

async function save() {
  saveLoading.value = true;
  await handleUpsertAndSelect(form.value);
  setTimeout(() => {
    saveLoading.value = false;
  }, 500);
}

async function removeItem(p: Prompt) {
  await store.remove(p.id);
  await load();
}

async function duplicateItem(p: Prompt) {
  const id = await store.duplicate(p.id);
  await load();
  const d = list.value.find(x => x.id === id);
  if (d) select(d);
}

async function toggleFav(p: PromptForm) {
  if (!p.id) return;
  await store.toggleFavorite(p.id);
  await load();
  const updated = list.value.find(x => x.id === p.id);
  if (updated) select(updated);
}

async function exportAll() {
  const data = await store.exportAll();
  const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `prompts-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importClick() {
  fileInput.value && fileInput.value.click();
}

function importFile(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target && target.files && target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const data = JSON.parse(reader.result as string);
      await store.importBatch(data);
      await load();
    } catch (err) {
      console.error('Import prompts failed', err);
    }
  };
  reader.readAsText(file);
  target.value = '';
}

function getIconType(item: Prompt): string {
  if (item.favorite) return 'mdi-star';
  return 'mdi-bookmark';
}


onMounted(async () => {
  await load();
});
</script>

<style lang="scss">
// ─── Layout ──────────────────────────────────────────────────────────────────
.height-calc-10 {
  max-height: calc(100% - 10px);
  height: auto;
}

.prompt-manager {
  height: calc(100vh - 60px);
  width: 100%;
  display: flex;
  flex-direction: column;
}

.prompt-header {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
}

.prompt-content {
  flex: 1;
  overflow: hidden;
}

.responsive-container {
  width: 100%;
}

@media (min-width: 1024px) {
  .responsive-container {
    width: 90%;
    max-width: 1200px;
  }
}

@media (min-width: 1440px) {
  .responsive-container {
    width: 85%;
    max-width: 1400px;
  }
}

@media (min-width: 1920px) {
  .responsive-container {
    width: 80%;
    max-width: 1600px;
  }
}

.header-title {
  color: rgb(var(--v-theme-darkPurple)) !important;
}

// ─── Typography ──────────────────────────────────────────────────────────────
.section-title {
  color: rgb(var(--v-theme-darkPurple)) !important;
  font-size: 16px;
  font-weight: 700;
}

.fav-icon {
  color: rgb(var(--v-theme-darkPrimary));
}

.fav-icon.is-favorite {
  color: #FFC107;
}

.v-theme--dark {
  .fav-icon {
    color: var(--text-muted);
  }

  .fav-icon.is-favorite {
    color: #FFC107;
  }
}

.list-section {
  background: var(--surface-elevated) !important;
}


// ─── Search ──────────────────────────────────────────────────────────────────
.pm-search-field .v-field {
  background: rgb(var(--v-theme-inputBtn)) !important;
}

.pm-search-field input::placeholder {
  color: rgb(var(--v-theme-darkPrimary)) !important;
  opacity: 1 !important;
}

.search-icon {
  color: rgb(var(--v-theme-darkPrimary)) !important;
}

// ─── Buttons ─────────────────────────────────────────────────────────────────
.normal-btn {
  background: rgba(var(--v-theme-lightBlue), 0.1) !important;
  color: rgb(var(--v-theme-darkPrimary)) !important;
  font-weight: 600;
  letter-spacing: 1px;
  transition: background 0.2s;

  &:hover,
  &:focus {
    background: rgb(var(--v-theme-lightBlue), 0.2) !important;
  }
}

.red-btn {
  background: rgba(var(--v-theme-primary), 0.08) !important;
  color: rgb(var(--v-theme-primary)) !important;
  font-weight: 600;
  letter-spacing: 1px;
  transition: background 0.2s;

  &:hover,
  &:focus {
    background: rgba(var(--v-theme-primary), 0.14) !important;
  }
}

.add-btn {
  background: rgba(var(--v-theme-primary), 0.08) !important;
  color: rgb(var(--v-theme-primary)) !important;
  font-weight: 600;
  letter-spacing: 1px;
  transition: background 0.2s;

  &:hover,
  &:focus {
    background: rgba(var(--v-theme-primary), 0.14) !important;
  }
}

// ─── List ────────────────────────────────────────────────────────────────────
.pm-list {
  padding: 0 12px 12px 12px !important;
}

.v-list-item.pm-list-item {
  padding: 10px !important;
  margin-bottom: 10px !important;
  border-radius: 16px !important;
  transition: all 0.2s ease;
  border: none !important;
  outline: none !important;
  background-color: rgb(var(--v-theme-inputBtn)) !important;

  &:last-child {
    margin-bottom: 0 !important;
  }

  &.is-selected {
    background-color: var(--list-selected-bg) !important;
  }

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    background-color: var(--list-hover-bg) !important;

    .v-icon {
      color: rgb(var(--v-theme-primary)) !important;
    }

    .pm-avatar {
      background: rgba(var(--v-theme-pink), 0.3) !important;
    }
  }
}

.pm-avatar {
  min-width: 45px !important;
  width: 45px !important;
  height: 45px !important;
  border-radius: 12px !important;
  background: rgba(var(--v-theme-lightBlue), 0.3) !important;
  margin-right: 12px !important;
  transition: background 0.2s ease;

  &.is-selected {
    background: rgba(var(--v-theme-lightBlue), 0.5) !important;
  }

  .v-icon {
    color: rgb(var(--v-theme-darkPrimary)) !important;
  }
}

.item-btn,
.item-btn .v-icon {
  color: rgb(var(--v-theme-darkPrimary)) !important;
}

.item-btn:hover,
.item-btn:hover .v-icon {
  color: rgb(var(--v-theme-primary)) !important;
}

// ─── Textarea scrollbar ───────────────────────────────────────────────────────
.white-field textarea {
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

// ─── Dark theme ──────────────────────────────────────────────────────────────
.v-theme--dark {
  .header-title {
    color: white !important;
  }

  .section-title {
    color: white !important;
  }

  .normal-btn {
    background: rgb(var(--v-theme-sideBar)) !important;
    color: white !important;
  }

  .red-btn {
    background: rgb(var(--v-theme-sideBar), 0.7) !important;
  }

  .add-btn {
    background: rgb(var(--v-theme-listItemBg), 0.7) !important;
  }

  .list-section {
    background: rgb(var(--v-theme-sideBar)) !important;
  }

  .pm-search-field input::placeholder {
    color: white !important;
    opacity: 1 !important;
  }

  .search-icon {
    color: white !important;
  }

  .pm-list {
    background: rgb(var(--v-theme-sideBar)) !important;
  }

  .v-list-item.pm-list-item {
    background: rgb(var(--v-theme-listItemBg)) !important;

    &.is-selected {
      background-color: rgb(var(--v-theme-inputBtn), 0.2) !important;
    }

    &:hover {
      background-color: rgba(var(--v-theme-pink), 0.1) !important;
    }
  }

  .pm-avatar {
    background: rgba(var(--v-theme-lightBlue), 0.7) !important;

    &.is-selected {
      background: rgba(var(--v-theme-lightBlue), 0.5) !important;
    }

    .v-icon {
      color: white !important;
    }
  }

  .v-list-item.pm-list-item:hover .pm-avatar {
    background: rgba(var(--v-theme-pink), 0.3) !important;
  }

  .item-btn,
  .item-btn .v-icon {
    color: white !important;
    opacity: 1;
  }
}
</style>
