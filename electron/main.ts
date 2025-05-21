// electron/main.ts
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

import { app, BrowserWindow, dialog, ipcMain } from 'electron';

import { fileServer } from './file-server.js';
import { newProject, TEMPLATES } from './tasks/new-project.js';


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
ipcMain.handle('file-server:start', async (event, port = 4000, rootDir: string) => {
  try {
    await fileServer.start(port, rootDir);
    return {
      success: true,
      running: fileServer.isServerRunning(),
      port: fileServer.getPort()
    };
  } catch (error: any) {
    console.error('Failed to start server:', error);
    return { success: false, error: error.message ?? 'Unknown error' };
  }
});

ipcMain.handle('file-server:stop', async () => {
  try {
    await fileServer.stop();
    return {
      success: true,
      running: fileServer.isServerRunning()
    };
  } catch (error: any) {
    console.error('Failed to stop server:', error);
    return { success: false, error: error.message ?? 'Unknown error' };
  }
});

ipcMain.handle('file-server:status', async () => {
  return {
    running: fileServer.isServerRunning(),
    port: fileServer.getPort()
  };
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
fileServer.on('log', (...info) => {
  BrowserWindow.getAllWindows().forEach(window => {
    window.webContents.send('file-server:log', ...info);
  });
});

fileServer.on('error', (...info) => {
  BrowserWindow.getAllWindows().forEach(window => {
    window.webContents.send('file-server:error', ...info);
  });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', async () => {
  // Stop server when closing app
  if (fileServer.isServerRunning()) {
    await fileServer.stop();
  }

  if (process.platform !== 'darwin') app.quit();
});
