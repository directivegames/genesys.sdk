<script setup lang="ts">
import HelloWorld from './components/HelloWorld.vue'
import FolderSelector from './components/FolderSelector.vue'
import ServerControl from './components/ServerControl.vue'
import { ref } from 'vue'

const selectedFolder = ref<string | null>(null)

const handleFolderSelected = (path: string) => {
  selectedFolder.value = path
  console.log('Selected folder:', path)
}
</script>

<template>
  <div class="container">
    <h2>Folder Selection</h2>
    <FolderSelector 
      label="Select Working Directory" 
      placeholder="Choose a folder for your project..."
      @folder-selected="handleFolderSelected" 
    />
    <div v-if="selectedFolder" class="selected-path">
      Selected folder: {{ selectedFolder }}
    </div>
  </div>
  
  <ServerControl />
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}

.container {
  margin-top: 2rem;
  padding: 1.5rem;
  border: 1px solid #eee;
  border-radius: 8px;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.selected-path {
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: #f0f8ff;
  border-radius: 4px;
  word-break: break-all;
}
</style>
