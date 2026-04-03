<template>
  <div class="file-uploader">
    <v-chip v-if="fileDataUri"
            class="px-1 py-3 file-chip pe-3"
            label
            closable
            close-icon="mdi-close-circle"
            @click:close="removeFile">
      <v-img v-if="fileDataUriType.includes('image')"
             :src="fileDataUri"
             width="25"
             height="25"
             class="rounded-lg"></v-img>
      <v-icon v-else
              size="25"
              color="grey-darken-1">
        {{ getFileIcon(fileDataUriType).name }}
      </v-icon>
    </v-chip>

    <v-tooltip location="bottom"
               content-class="bg-grey-darken-1">
      <template v-slot:activator="{ props: tooltipProps }">
        <div v-bind="tooltipProps">
          <v-file-input v-model="input"
                        class="compact-file-input"
                        :accept="acceptTypes"
                        hide-input
                        label="Upload a File."
                        hide-details></v-file-input>
        </div>
      </template>
      <span style="color:white">Attach a file</span>
    </v-tooltip>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

interface FileIcon {
  type: string;
  name: string;
}

const props = defineProps<{
  fileDataUri: string | null;
  fileInput: File | null;
}>();

const emit = defineEmits<{
  (e: 'update:fileDataUri', val: string | null): void;
}>();

const input = ref<File | null>(null);

const acceptTypes =
  'application/json,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv,image/png,image/jpeg,image/gif';

const fileDataUriType = computed(() => {
  if (!props.fileDataUri) return '';
  return props.fileDataUri.split(',')[0].split(':')[1].split(';')[0];
});

watch(() => props.fileInput, (file) => {
  if (file) {
    input.value = file;
  }
});

watch(input, async (file) => {
  if (file) {
    const dataUri = await getDataURL(file);
    emit('update:fileDataUri', dataUri);
  }
});

async function removeFile() {
  emit('update:fileDataUri', null);
  input.value = null;
}

function getDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getFileIcon(type: string): Partial<FileIcon> {
  const fileIcons: FileIcon[] = [
    { type: 'application/pdf', name: 'mdi-file-pdf-box' },
    { type: 'application/msword', name: 'mdi-file-word' },
    { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', name: 'mdi-file-word' },
    { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', name: 'mdi-file-powerpoint' },
    { type: 'application/vnd.ms-powerpoint', name: 'mdi-file-powerpoint' },
    { type: 'text/csv', name: 'mdi-file-table' },
    { type: 'text/plain', name: 'mdi-text-box' },
    { type: 'application/json', name: 'mdi-code-json' },
  ];
  return fileIcons.find((icon) => icon.type === type) || {};
}

defineExpose({ removeFile });
</script>

<style scoped lang="scss">
.file-uploader {
  display: flex;
  align-items: center;
}

.file-chip :deep(.v-chip__underlay) {
  background-color: transparent !important;
}

.file-chip:hover :deep(.v-chip__underlay) {
  background-color: var(--code-bg) !important;
}

.file-chip :deep(.v-chip__close:hover .v-icon) {
  color: var(--text-muted) !important;
}

:deep(.compact-file-input .v-input__prepend-outer),
:deep(.v-input__prepend-outer),
:deep(.v-input__prepend) {
  margin-right: 0 !important;
}
</style>
