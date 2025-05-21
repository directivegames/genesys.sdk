import { contextBridge, ipcRenderer } from 'electron';

// Log to show preload script is running
console.log('Preload script is running');

type ServerCallback<T = any> = (data: T) => void;

// Expose the Electron API to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Folder selection
  selectFolder: () => {
    console.log('Invoking dialog:openDirectory');
    return ipcRenderer.invoke('dialog:openDirectory');
  },

  // Server management
  startServer: (port?: number) => ipcRenderer.invoke('server:start', port),
  stopServer: () => ipcRenderer.invoke('server:stop'),
  getServerStatus: () => ipcRenderer.invoke('server:status'),

  // Server logs
  getServerLogs: () => ipcRenderer.invoke('server:getLogs'),

  // Event listeners
  onServerStarted: (callback: ServerCallback<any>) => ipcRenderer.on('server:started', (_, data) => callback(data)),
  onServerStopped: (callback: ServerCallback<void>) => ipcRenderer.on('server:stopped', () => callback()),
  onServerError: (callback: ServerCallback<string>) => ipcRenderer.on('server:error', (_, error) => callback(error)),
  onServerLog: (callback: ServerCallback<any>) => ipcRenderer.on('server:log', (_, log) => callback(log)),
});
