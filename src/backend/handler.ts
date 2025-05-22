import { ipcMain } from 'electron';

import { fileServer } from './file-server.js';

import type { FileServerStatus } from '../api.js';


ipcMain.handle('ping', () => {
  return 'pong from main process';
});

ipcMain.handle('fileServer.start', async (_, port: number, rootDir: string) => {
  await fileServer.start(port, rootDir);
});

ipcMain.handle('fileServer.stop', async () => {
  await fileServer.stop();
});

ipcMain.handle('fileServer.status', async (): Promise<FileServerStatus> => {
  return {
    isRunning: fileServer.isServerRunning(),
    port: fileServer.getPort(),
  };
});

export {};
