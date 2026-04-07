<template>
  <v-container>
    <v-row class="justify-center"
           v-for="(item, index) in getRandomItems"
           :key="index">
      <v-col cols="12"
             sm="12"
             md="10"
             lg="6">
        <v-card class="d-flex rounded-xl prompt-card"
                elevation="0"
                @click="() => selectPrompt(item)">
          <div :class="`d-flex align-center mr-2 rounded-0 px-4 ${item.bgColor}`">
            <v-icon size="x-large"
                    :color="item.iconColor">
              {{ item.icon }}
            </v-icon>
          </div>
          <div class="d-flex flex-column py-3 px-2">
            <div class="prompt-title mb-2">{{ item.title }}</div>
            <div class="prompt-subtitle">{{ item.subtitle }}</div>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface PromptCard {
  title: string;
  subtitle: string;
  prompt: string;
  icon: string;
  iconColor: string;
  bgColor: string;
}

const emit = defineEmits<{
  (e: 'selected', item: PromptCard): void;
}>();

const items: PromptCard[] = [
  {
    title: 'Generate Image',
    subtitle: 'Enter a description to generate the image you want.',
    prompt: `@image Please generate an image with the theme of [dog], in [cartoon style], with a [bright] background.`,
    icon: 'mdi-image-area',
    iconColor: 'pink',
    bgColor: 'pink-bg-card',
  },
  {
    title: 'Summarize File Content',
    subtitle: 'Upload or specify a file to get a comprehensive summary.',
    prompt: `Please summarize the content of the uploaded file, highlighting the key points, main topics, and important information in a clear and concise manner.`,
    icon: 'mdi-file-document-outline',
    iconColor: 'purple',
    bgColor: 'purple-bg-card',
  },
  {
    title: 'Extract Text from Image',
    subtitle: 'Upload an image to extract and recognize text content.',
    prompt: `Please analyze the uploaded image and extract all readable text content. Include any text, numbers, or symbols that are visible in the image, and organize them in a clear and structured format.`,
    icon: 'mdi-text-recognition',
    iconColor: 'blue',
    bgColor: 'blue-bg-card',
  },
];

const getRandomItems = computed(() => {
  const count = Math.min(3, items.length);
  if (items.length <= count) {
    return [...items];
  }
  return [...items]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
});

function selectPrompt(item: PromptCard) {
  emit('selected', item);
}

</script>

<style lang="scss">
.prompt-card {
  transition: box-shadow 0.2s, transform 0.2s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  overflow: hidden;

  &:hover {
    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.32);
    transform: translateY(-8px) scale(1.06);
  }
}

.prompt-title {
  font-weight: 700;
  font-size: 16px;
  line-height: 100%;
  letter-spacing: 0px;
}

.prompt-subtitle {
  color: var(--text-muted, #666);
  white-space: normal;
  font-weight: 400;
  font-size: 14px;
  line-height: 16px;
  letter-spacing: 0px;
}
</style>
