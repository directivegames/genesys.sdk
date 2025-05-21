<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import LogConsole from './LogConsole.vue';

const serverRunning = ref(false);
const serverPort = ref(3000);
const serverStatus = ref('Stopped');
const statusClass = ref('status-stopped');
const isLoading = ref(false);
const errorMessage = ref('');

// Initialize server status
onMounted(async () => {
  await checkServerStatus();
  setupEventListeners();
});

// Clean up event listeners
onUnmounted(() => {
  removeEventListeners();
});

// Set up event listeners for server events
const setupEventListeners = () => {
  window.electronAPI.onServerStarted((data) => {
    console.log('Server started event received', data);
    serverRunning.value = true;
    serverPort.value = data.port;
    serverStatus.value = `Running on port ${data.port}`;
    statusClass.value = 'status-running';
    isLoading.value = false;
    errorMessage.value = '';
  });

  window.electronAPI.onServerStopped(() => {
    console.log('Server stopped event received');
    serverRunning.value = false;
    serverStatus.value = 'Stopped';
    statusClass.value = 'status-stopped';
    isLoading.value = false;
    errorMessage.value = '';
  });

  window.electronAPI.onServerError((error) => {
    console.error('Server error event received', error);
    errorMessage.value = error;
    isLoading.value = false;
  });
};

// Remove event listeners
const removeEventListeners = () => {
  // In a real app we would need to remove the listeners here
  // but Electron's contextBridge doesn't support removing listeners directly
};

// Start the server
const startServer = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = '';
    serverStatus.value = 'Starting...';
    
    const result = await window.electronAPI.startServer(serverPort.value);
    
    console.log('Start server result:', result);
    
    if (!result.success) {
      errorMessage.value = result.error || 'Failed to start server';
      serverStatus.value = 'Error';
      statusClass.value = 'status-error';
    }
  } catch (error) {
    console.error('Error starting server:', error);
    errorMessage.value = error.message || 'Failed to start server';
    serverStatus.value = 'Error';
    statusClass.value = 'status-error';
  }
};

// Stop the server
const stopServer = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = '';
    serverStatus.value = 'Stopping...';
    
    const result = await window.electronAPI.stopServer();
    
    console.log('Stop server result:', result);
    
    if (!result.success) {
      errorMessage.value = result.error || 'Failed to stop server';
      serverStatus.value = 'Error';
      statusClass.value = 'status-error';
    }
  } catch (error) {
    console.error('Error stopping server:', error);
    errorMessage.value = error.message || 'Failed to stop server';
    serverStatus.value = 'Error';
    statusClass.value = 'status-error';
  }
};

// Check server status
const checkServerStatus = async () => {
  try {
    const status = await window.electronAPI.getServerStatus();
    serverRunning.value = status.running;
    
    if (status.running) {
      serverPort.value = status.port || 3000;
      serverStatus.value = `Running on port ${serverPort.value}`;
      statusClass.value = 'status-running';
    } else {
      serverStatus.value = 'Stopped';
      statusClass.value = 'status-stopped';
    }
  } catch (error) {
    console.error('Error checking server status:', error);
    errorMessage.value = error.message || 'Failed to check server status';
    serverStatus.value = 'Error';
    statusClass.value = 'status-error';
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
    
    <div class="server-status">
      <span>Status: </span>
      <span :class="statusClass">{{ serverStatus }}</span>
    </div>
    
    <div class="control-panel">
      <div class="port-config">
        <label for="server-port">Port:</label>
        <input 
          id="server-port" 
          type="number" 
          min="1024" 
          max="65535" 
          v-model="serverPort" 
          :disabled="serverRunning || isLoading" 
          @input="handlePortChange"
        />
      </div>
      
      <div class="server-actions">
        <button 
          v-if="!serverRunning" 
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
    
    <div v-if="serverRunning" class="server-info">
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
    
    <!-- Server Logs Console -->
    <LogConsole 
      maxHeight="400px" 
      title="Server Console Output"
    />
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