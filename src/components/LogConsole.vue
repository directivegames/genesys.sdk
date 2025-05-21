<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';

interface Props {
  autoScroll?: boolean;
  maxHeight?: string;
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  autoScroll: true,
  maxHeight: '300px',
  title: 'Server Logs'
});

// State
const logs = ref<LogEntry[]>([]);
const logConsoleRef = ref<HTMLDivElement | null>(null);
const showLogs = ref(true);
const filterLevel = ref<string>('all');
const searchQuery = ref('');

// Get initial logs
onMounted(async () => {
  setupEventListeners();
  await fetchLogs();
});

// Clean up
onUnmounted(() => {
  removeEventListeners();
});

// Setup event listeners
const setupEventListeners = () => {
  window.electronAPI.onServerLog((log) => {
    logs.value.push(log);
    
    if (props.autoScroll) {
      scrollToBottom();
    }
  });
};

// Clean up event listeners
const removeEventListeners = () => {
  // Electron doesn't support direct removal of listeners via context bridge
};

// Fetch logs
const fetchLogs = async () => {
  try {
    const serverLogs = await window.electronAPI.getServerLogs();
    logs.value = serverLogs;
    
    if (props.autoScroll) {
      scrollToBottom();
    }
  } catch (error) {
    console.error('Failed to fetch logs:', error);
  }
};

// Auto-scroll to bottom when logs update
watch(logs, () => {
  if (props.autoScroll) {
    scrollToBottom();
  }
}, { deep: true });

// Scroll to bottom
const scrollToBottom = () => {
  if (logConsoleRef.value) {
    setTimeout(() => {
      if (logConsoleRef.value) {
        logConsoleRef.value.scrollTop = logConsoleRef.value.scrollHeight;
      }
    }, 0);
  }
};

// Toggle logs visibility
const toggleLogs = () => {
  showLogs.value = !showLogs.value;
  if (showLogs.value && props.autoScroll) {
    scrollToBottom();
  }
};

// Clear logs
const clearLogs = () => {
  logs.value = [];
};

// Refresh logs
const refreshLogs = async () => {
  await fetchLogs();
};

// Format timestamp
const formatTimestamp = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  } catch (e) {
    return timestamp;
  }
};

// Get filtered logs
const filteredLogs = computed(() => {
  return logs.value.filter(log => {
    // Filter by level
    if (filterLevel.value !== 'all' && log.level !== filterLevel.value) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery.value && !log.message.toLowerCase().includes(searchQuery.value.toLowerCase())) {
      return false;
    }
    
    return true;
  });
});

// Get log class based on level
const getLogClass = (level: string): string => {
  switch (level) {
    case 'error':
      return 'log-error';
    case 'warn':
      return 'log-warn';
    case 'info':
      return 'log-info';
    case 'debug':
      return 'log-debug';
    default:
      return '';
  }
};
</script>

<template>
  <div class="log-console-container">
    <div class="log-header">
      <h3>{{ props.title }}</h3>
      <div class="log-actions">
        <button class="toggle-btn" @click="toggleLogs">
          {{ showLogs ? 'Hide' : 'Show' }}
        </button>
        <button class="refresh-btn" @click="refreshLogs" title="Refresh logs">
          ⟳
        </button>
        <button class="clear-btn" @click="clearLogs" title="Clear logs">
          🗑
        </button>
      </div>
    </div>
    
    <div v-if="showLogs" class="log-filters">
      <div class="search-filter">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Search logs..." 
          class="search-input"
        />
      </div>
      
      <div class="level-filter">
        <select v-model="filterLevel">
          <option value="all">All Levels</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
          <option value="debug">Debug</option>
        </select>
      </div>
    </div>
    
    <div 
      v-if="showLogs" 
      class="log-console" 
      ref="logConsoleRef"
      :style="{ maxHeight: props.maxHeight }"
    >
      <div v-if="filteredLogs.length === 0" class="no-logs">
        No logs to display
      </div>
      
      <div 
        v-for="(log, index) in filteredLogs" 
        :key="index"
        :class="['log-entry', getLogClass(log.level)]"
      >
        <span class="log-timestamp">{{ formatTimestamp(log.timestamp) }}</span>
        <span class="log-level">[{{ log.level.toUpperCase() }}]</span>
        <span class="log-message">{{ log.message }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.log-console-container {
  margin-top: 1rem;
  border: 1px solid #eee;
  border-radius: 4px;
  background-color: #f8f9fa;
  width: 100%;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: #f1f1f1;
  border-bottom: 1px solid #e0e0e0;
}

.log-header h3 {
  margin: 0;
  font-size: 1rem;
  color: #333;
}

.log-actions {
  display: flex;
  gap: 0.5rem;
}

.log-actions button {
  padding: 0.25rem 0.5rem;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 3px;
  cursor: pointer;
  font-size: 0.8rem;
}

.toggle-btn:hover {
  background-color: #f0f0f0;
}

.refresh-btn:hover {
  background-color: #e6f7ff;
}

.clear-btn:hover {
  background-color: #fff0f0;
}

.log-filters {
  display: flex;
  padding: 0.5rem;
  border-bottom: 1px solid #e0e0e0;
  background-color: #fafafa;
  gap: 0.5rem;
}

.search-filter {
  flex: 1;
}

.search-input {
  width: 100%;
  padding: 0.35rem 0.5rem;
  border: 1px solid #ddd;
  border-radius: 3px;
  font-size: 0.85rem;
}

.level-filter select {
  padding: 0.35rem 0.5rem;
  border: 1px solid #ddd;
  border-radius: 3px;
  background-color: white;
  font-size: 0.85rem;
}

.log-console {
  padding: 0.5rem;
  overflow-y: auto;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.85rem;
  line-height: 1.4;
  background-color: #1e1e1e;
  color: #f0f0f0;
}

.no-logs {
  color: #888;
  text-align: center;
  padding: 1rem;
}

.log-entry {
  margin-bottom: 0.25rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid #333;
  white-space: pre-wrap;
  word-break: break-word;
}

.log-timestamp {
  color: #888;
  margin-right: 0.5rem;
}

.log-level {
  margin-right: 0.5rem;
  font-weight: bold;
}

.log-info .log-level {
  color: #58b7ff;
}

.log-warn .log-level {
  color: #e6a23c;
}

.log-error .log-level {
  color: #f56c6c;
}

.log-debug .log-level {
  color: #909399;
}

.log-message {
  color: #dcdcdc;
}
</style> 