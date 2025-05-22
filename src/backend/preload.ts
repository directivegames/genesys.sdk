import { contextBridge, ipcRenderer } from 'electron';

import type { ElectronAPI } from '../api';

const electronAPI: ElectronAPI = {
  ping: () => ipcRenderer.invoke('ping'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
