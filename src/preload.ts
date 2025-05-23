import { contextBridge, ipcRenderer } from 'electron';

import type { ElectronAPI, LogCallback } from './api.js';

// see handler.ts
const electronAPI: ElectronAPI = {
  app: {
    getInfo: () => ipcRenderer.invoke('app.getInfo'),
  },

  fileServer: {
    start: (port: number, rootDir: string) => ipcRenderer.invoke('fileServer.start', port, rootDir),
    stop: () => ipcRenderer.invoke('fileServer.stop'),
    status: () => ipcRenderer.invoke('fileServer.status'),
  },

  os: {
    chooseDirectory: () => ipcRenderer.invoke('os.chooseDirectory'),
    openPath: (path: string) => ipcRenderer.invoke('os.openPath', path),
    openUrl: (url: string) => ipcRenderer.invoke('os.openUrl', url),
    readDirectory: (path: string) => ipcRenderer.invoke('os.readDirectory', path),
    exists: (path: string) => ipcRenderer.invoke('os.exists', path),
  },

  tools: {
    createProject: (projectPath: string, templateId: string) => ipcRenderer.invoke('tools.createProject', projectPath, templateId),
    deleteProject: (projectPath: string) => ipcRenderer.invoke('tools.deleteProject', projectPath),
    getProjectTemplates: () => ipcRenderer.invoke('tools.getProjectTemplates'),
    buildProject: (projectPath: string) => ipcRenderer.invoke('tools.buildProject', projectPath),
  },

  logging: {
    onLog: (callback: LogCallback) => {
      const listener = (_: any, ...args: any[]) => callback(...args);
      ipcRenderer.on('log', listener);
      return () => ipcRenderer.removeListener('log', listener);
    },

    onWarn: (callback: LogCallback) => {
      const listener = (_: any, ...args: any[]) => callback(...args);
      ipcRenderer.on('warn', listener);
      return () => ipcRenderer.removeListener('warn', listener);
    },

    onError: (callback: LogCallback) => {
      const listener = (_: any, ...args: any[]) => callback(...args);
      ipcRenderer.on('error', listener);
      return () => ipcRenderer.removeListener('error', listener);
    },
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
