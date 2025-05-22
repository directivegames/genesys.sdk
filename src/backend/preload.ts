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
  os: {
    openDirectory: () => ipcRenderer.invoke('os.openDirectory'),
  },
  tools: {
    createProject: (projectPath: string, templateId: string) => ipcRenderer.invoke('tools.createProject', projectPath, templateId),
    getProjectTemplates: () => ipcRenderer.invoke('tools.getProjectTemplates'),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
