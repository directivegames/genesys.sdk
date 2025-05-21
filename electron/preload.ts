import { contextBridge, ipcRenderer } from 'electron';
import { ElectronAPI } from '../src/types/vite-env';

// Log to show preload script is running
console.log('Preload script is running');

export type ServerCallback<T extends any[] = any[]> = (...data: T) => void;

const api: ElectronAPI = {
  // Folder selection
  selectFolder: () => {
    console.log('Invoking dialog:openDirectory');
    return ipcRenderer.invoke('dialog:openDirectory');
  },

  // Server management
  startFileServer: (port: number, rootDir: string) => ipcRenderer.invoke('file-server:start', port, rootDir),
  stopFileServer: () => ipcRenderer.invoke('file-server:stop'),
  getFileServerStatus: () => ipcRenderer.invoke('file-server:status'),

  // Project management
  newProject: (path: string, template: string) => ipcRenderer.invoke('newProject', path, template),
  getProjectTemplates: () => ipcRenderer.invoke('getProjectTemplates'),

  // Event listeners
  onFileServerLog: (callback: ServerCallback) => {
    const listener = (_: any, ...args: any[]) => callback(...args);
    ipcRenderer.on('file-server:log', listener);
    return () => ipcRenderer.removeListener('file-server:log', listener);
  },

  onFileServerError: (callback: ServerCallback) => {
    const listener = (_: any, ...args: any[]) => callback(...args);
    ipcRenderer.on('file-server:error', listener);
    return () => ipcRenderer.removeListener('file-server:error', listener);
  },
}

// Expose the Electron API to the renderer
contextBridge.exposeInMainWorld('electronAPI', api);
