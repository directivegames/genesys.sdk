import { contextBridge, ipcRenderer } from 'electron';

import type { ElectronAPI } from '../api';

// see handler.ts
const electronAPI: ElectronAPI = {
  ping: () => ipcRenderer.invoke('ping'),
  fileServer: {
    start: (port: number, rootDir: string) => ipcRenderer.invoke('fileServer.start', port, rootDir),
    stop: () => ipcRenderer.invoke('fileServer.stop'),
    status: () => ipcRenderer.invoke('fileServer.status'),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
