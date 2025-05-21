// electron/main.ts
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

import { app, BrowserWindow, dialog, ipcMain } from 'electron';

import { serverManager } from './server.js';
import { newProject, TEMPLATES } from './tasks/newProject.js';

import type { LogEntry } from './server.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
    },
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    win.loadURL('http://localhost:5173');
    // Open DevTools in development mode
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// Handle folder selection
ipcMain.handle('dialog:openDirectory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });

  if (canceled) {
    return null;
  } else {
    return filePaths[0];
  }
});

// Server management IPC handlers
ipcMain.handle('server:start', async (event, port = 3000) => {
  try {
    serverManager.setPort(port);
    const success = serverManager.start();
    return {
      success,
      running: serverManager.isServerRunning(),
      port: serverManager.getPort()
    };
  } catch (error: any) {
    console.error('Failed to start server:', error);
    return { success: false, error: error.message ?? 'Unknown error' };
  }
});

ipcMain.handle('server:stop', async () => {
  try {
    const success = serverManager.stop();
    return {
      success,
      running: serverManager.isServerRunning()
    };
  } catch (error: any) {
    console.error('Failed to stop server:', error);
    return { success: false, error: error.message ?? 'Unknown error' };
  }
});

ipcMain.handle('server:status', async () => {
  return {
    running: serverManager.isServerRunning(),
    port: serverManager.getPort()
  };
});

// Get server logs
ipcMain.handle('server:getLogs', async () => {
  return serverManager.getLogs();
});

// New project
ipcMain.handle('newProject', async (event, path: string, template: string) => {
  return newProject(path, template);
});

// Get project templates
ipcMain.handle('getProjectTemplates', async () => {
  return TEMPLATES;
});

// Listen to server events and notify renderer
serverManager.on('started', (info) => {
  BrowserWindow.getAllWindows().forEach(window => {
    window.webContents.send('server:started', info);
  });
});

serverManager.on('stopped', () => {
  BrowserWindow.getAllWindows().forEach(window => {
    window.webContents.send('server:stopped');
  });
});

serverManager.on('error', (error) => {
  console.error('Server error:', error);
  BrowserWindow.getAllWindows().forEach(window => {
    window.webContents.send('server:error', error.message);
  });
});

// Forward server logs to renderer
serverManager.on('log', (logEntry: LogEntry) => {
  BrowserWindow.getAllWindows().forEach(window => {
    window.webContents.send('server:log', logEntry);
  });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // Stop server when closing app
  if (serverManager.isServerRunning()) {
    serverManager.stop();
  }

  if (process.platform !== 'darwin') app.quit();
});

const logFile = path.join(app.getPath('userData'), 'main-error.log');

function logError(error: unknown) {
  console.error('Uncaught exception:', error);
}

process.on('uncaughtException', logError);
process.on('unhandledRejection', logError);
