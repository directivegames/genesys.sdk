<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  label?: string;
  placeholder?: string;
}>();

const selectedPath = ref<string | null>(null);
const emit = defineEmits<{
  (e: 'folderSelected', path: string): void;
}>();

const selectFolder = async () => {
  try {
    console.log('Attempting to select folder...');
    
    // Check if electron API is available
    if (!window.electronAPI) {
      console.error('Electron API not available!');
      return;
    }
    
    const path = await window.electronAPI.selectFolder();
    console.log('Selected folder path:', path);
    
    if (path) {
      selectedPath.value = path;
      emit('folderSelected', path);
    }
  } catch (error) {
    console.error('Error selecting folder:', error);
  }
};
</script>

<template>
  <div class="folder-selector">
    <label v-if="props.label">{{ props.label }}</label>
    <div class="input-group">
      <input
        type="text"
        :placeholder="props.placeholder || 'Select a folder...'"
        v-model="selectedPath"
        readonly
      />
      <button type="button" @click="selectFolder">Browse</button>
    </div>
  </div>
</template>

<style scoped>
.folder-selector {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.input-group {
  display: flex;
  align-items: center;
}

input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-right: 0.5rem;
  background-color: #f8f8f8;
  cursor: default;
}

button {
  padding: 0.5rem 1rem;
  background-color: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #369a6e;
}
</style> 