<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const isRunning = ref(false);
const serverPort = ref(4000);
const errorMessage = ref('');
const isLoading = ref(false);

let removeLogListener: (() => void) | undefined;
let removeErrorListener: (() => void) | undefined;

// Initialize server status
onMounted(async () => {
  setupEventListeners();
});

// Clean up event listeners
onUnmounted(() => {
  removeLogListener?.();
  removeErrorListener?.();
});

// Set up event listeners for server events
const setupEventListeners = () => {
  removeLogListener = window.electronAPI.onFileServerLog((...log) => {
    console.log(...log);
  });

  removeErrorListener = window.electronAPI.onFileServerError((...error) => {
    console.error(...error);
    errorMessage.value = error.join('\n');
  });
};

// Start the server
const startServer = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = '';  
    await window.electronAPI.startFileServer(serverPort.value, ".");
    isRunning.value = true;
  } catch (error: any) {  
    console.error('Error starting server:', error);
    errorMessage.value = error.message || 'Failed to start server';
  } finally {
    isLoading.value = false;
  }
};

// Stop the server
const stopServer = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = '';    
    await window.electronAPI.stopFileServer();    
    isRunning.value = false;    
  } catch (error: any) {
    console.error('Error stopping server:', error);
    errorMessage.value = error.message || 'Failed to stop server';    
  } finally {
    isLoading.value = false;
  }
};

// Handle port change
const handlePortChange = (event: Event) => {
  const value = (event.target as HTMLInputElement).value;
  const port = parseInt(value, 10);
  
  if (!isNaN(port) && port > 0 && port < 65536) {
    serverPort.value = port;
    errorMessage.value = '';
  } else {
    errorMessage.value = 'Port must be a number between 1 and 65535';
  }
};
</script>

<template>
  <div class="server-control">
    <h2>Express Server Control</h2>
    
    <div class="control-panel">
      <div class="port-config">
        <label for="server-port">Port:</label>
        <input 
          id="server-port" 
          type="number" 
          min="1024" 
          max="65535" 
          v-model="serverPort" 
          :disabled="isRunning || isLoading" 
          @input="handlePortChange"
        />
      </div>
      
      <div class="server-actions">
        <button 
          v-if="!isRunning" 
          @click="startServer" 
          :disabled="isLoading"
          class="start-btn"
        >
          Start Server
        </button>
        
        <button 
          v-else 
          @click="stopServer" 
          :disabled="isLoading"
          class="stop-btn"
        >
          Stop Server
        </button>
      </div>
    </div>
    
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
    
    <div v-if="isRunning" class="server-info">
      <p>Server is running at <a :href="`http://localhost:${serverPort}`" target="_blank">http://localhost:{{ serverPort }}</a></p>
      <p>Test endpoints:</p>
      <ul>
        <li>
          <a :href="`http://localhost:${serverPort}/api/status`" target="_blank">/api/status</a>
        </li>
        <li>
          <a :href="`http://localhost:${serverPort}/api/hello`" target="_blank">/api/hello</a>
        </li>
      </ul>
    </div>    
  </div>
</template>

<style scoped>
.server-control {
  margin-top: 1.5rem;
  padding: 1.5rem;
  border: 1px solid #eee;
  border-radius: 8px;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.server-status {
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.status-running {
  color: #41b883;
  font-weight: bold;
}

.status-stopped {
  color: #666;
}

.status-error {
  color: #e74c3c;
  font-weight: bold;
}

.control-panel {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.port-config {
  margin-right: 1.5rem;
  display: flex;
  align-items: center;
}

.port-config label {
  margin-right: 0.5rem;
}

.port-config input {
  width: 80px;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.server-actions button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s;
}

.start-btn {
  background-color: #41b883;
}

.start-btn:hover {
  background-color: #369a6e;
}

.stop-btn {
  background-color: #e74c3c;
}

.stop-btn:hover {
  background-color: #c0392b;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
  opacity: 0.7;
}

.error-message {
  padding: 0.75rem;
  background-color: #ffeaea;
  border-left: 4px solid #e74c3c;
  color: #e74c3c;
  margin-bottom: 1rem;
}

.server-info {
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 4px;
  margin-bottom: 1.5rem;
}

.server-info a {
  color: #3498db;
  text-decoration: none;
}

.server-info a:hover {
  text-decoration: underline;
}

.server-info ul {
  margin-top: 0.5rem;
  padding-left: 1.5rem;
}

.server-info li {
  margin-bottom: 0.25rem;
}
</style> 