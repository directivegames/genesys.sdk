import type { ElectronAPI } from './vite-env';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};

