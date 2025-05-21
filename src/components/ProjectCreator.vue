<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { ProjectTemplate } from '../types/vite-env';

const projectPath = ref<string>('');
const selectedTemplate = ref<string>('');
const projectTemplates = ref<ProjectTemplate[]>([]);
const isLoading = ref(false);
const message = ref('');
const messageType = ref<'success' | 'error' | ''>('');

// Load templates when component is mounted
onMounted(async () => {
  await loadTemplates();
});

// Load available project templates
const loadTemplates = async () => {
  try {
    isLoading.value = true;
    projectTemplates.value = await window.electronAPI.getProjectTemplates();
  } catch (error) {
    console.error('Failed to load templates:', error);
    showError('Failed to load project templates');
  } finally {
    isLoading.value = false;
  }
};

// Select folder for project
const selectFolder = async () => {
  try {
    const selectedFolder = await window.electronAPI.selectFolder();
    if (selectedFolder) {
      projectPath.value = selectedFolder;
    }
  } catch (error) {
    console.error('Error selecting folder:', error);
    showError('Error selecting folder');
  }
};

// Create a new project
const createProject = async () => {
  // Validate inputs
  if (!projectPath.value) {
    showError('Please select a project location');
    return;
  }
  
  if (!selectedTemplate.value) {
    showError('Please select a project template');
    return;
  }
  
  try {
    isLoading.value = true;
    clearMessage();
    
    const result = await window.electronAPI.newProject(
      projectPath.value,
      selectedTemplate.value
    );
    
    if (result.success) {
      showSuccess(result.message);
    } else {
      showError(result.error || 'Failed to create project');
    }
  } catch (error: any) {
    console.error('Error creating project:', error);
    showError(error.message || 'Error creating project');
  } finally {
    isLoading.value = false;
  }
};

// Show success message
const showSuccess = (msg: string) => {
  message.value = msg;
  messageType.value = 'success';
};

// Show error message
const showError = (msg: string) => {
  message.value = msg;
  messageType.value = 'error';
};

// Clear message
const clearMessage = () => {
  message.value = '';
  messageType.value = '';
};
</script>

<template>
  <div class="project-creator">
    <h2>Create New Project</h2>
    
    <div class="form-group">
      <label for="project-path">Project Location:</label>
      <div class="path-select">
        <input 
          type="text" 
          id="project-path" 
          v-model="projectPath" 
          placeholder="Select a folder for your project"
          readonly
        />
        <button 
          type="button" 
          @click="selectFolder"
          :disabled="isLoading"
        >
          Browse
        </button>
      </div>
    </div>
    
    <div class="form-group">
      <label for="project-template">Project Template:</label>
      <select 
        id="project-template" 
        v-model="selectedTemplate"
        :disabled="isLoading || projectTemplates.length === 0"
      >
        <option value="" disabled>Select a template</option>
        <option 
          v-for="template in projectTemplates" 
          :key="template.id" 
          :value="template.id"
        >
          {{ template.name }}
        </option>
      </select>
    </div>
    
    <div v-if="message" :class="['message', messageType]">
      {{ message }}
    </div>
    
    <div class="actions">
      <button 
        type="button" 
        class="create-btn" 
        @click="createProject"
        :disabled="isLoading || !projectPath || !selectedTemplate"
      >
        {{ isLoading ? 'Creating...' : 'Create Project' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.project-creator {
  margin-top: 1.5rem;
  padding: 1.5rem;
  border: 1px solid #eee;
  border-radius: 8px;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #333;
}

.form-group {
  margin-bottom: 1.25rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.path-select {
  display: flex;
  gap: 0.5rem;
}

input[type="text"] {
  flex: 1;
  padding: 0.6rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f8f8f8;
  cursor: default;
}

select {
  width: 100%;
  padding: 0.6rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
}

button {
  padding: 0.6rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.path-select button {
  background-color: #42b883;
  color: white;
}

.path-select button:hover {
  background-color: #369a6e;
}

.template-description {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background-color: #f8f9fa;
  border-radius: 4px;
  font-style: italic;
  color: #666;
}

.message {
  padding: 0.75rem;
  margin-bottom: 1rem;
  border-radius: 4px;
}

.message.success {
  background-color: #eeffee;
  border-left: 4px solid #42b883;
  color: #2c7a58;
}

.message.error {
  background-color: #ffeaea;
  border-left: 4px solid #e74c3c;
  color: #e74c3c;
}

.actions {
  display: flex;
  justify-content: flex-end;
}

.create-btn {
  background-color: #42b883;
  color: white;
  font-weight: bold;
  padding: 0.75rem 1.5rem;
}

.create-btn:hover {
  background-color: #369a6e;
}

button:disabled {
  background-color: #ccc !important;
  cursor: not-allowed;
  opacity: 0.7;
}
</style> 