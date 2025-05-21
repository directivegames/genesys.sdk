import { contextBridge, ipcRenderer } from 'electron';

// Log to show preload script is running
console.log('Preload script is running');

// Expose the Electron API to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => {
    console.log('Invoking dialog:openDirectory');
    return ipcRenderer.invoke('dialog:openDirectory');
  }
});