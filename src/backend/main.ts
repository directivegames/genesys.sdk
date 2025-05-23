import path from 'path';
import { fileURLToPath } from 'url';

import { app, BrowserWindow, dialog, Menu } from 'electron';
import isDev from 'electron-is-dev';
import log from 'electron-log';
import electronUpdater from 'electron-updater';

import { getAppInfo } from './handler.js';
import { configureLogging } from './logging.js';
import './handler.js';

const { autoUpdater } = electronUpdater;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

configureLogging();

console.log('===============================================');
console.log(`\n${JSON.stringify(getAppInfo(), null, 2)}`);
console.log('===============================================');

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js'),
    },
  });

  // Enable context menu
  mainWindow.webContents.on('context-menu', (event, params) => {
    const menu = Menu.buildFromTemplate([
      {
        label: 'Copy',
        role: 'copy',
        enabled: params.selectionText.length > 0,
      },
      {
        label: 'Select All',
        role: 'selectAll',
      },
      { type: 'separator' },
      {
        label: 'Inspect Element',
        click: () => {
          mainWindow!.webContents.inspectElement(params.x, params.y);
        },
      },
    ]);
    menu.popup();
  });

  if (isDev) {
    await mainWindow!.loadURL('http://localhost:5173');
    mainWindow!.webContents.openDevTools();
  } else {
    await mainWindow!.loadFile(path.join(__dirname, '../index.html'));
  }
};

function checkForUpdates(): void {
  autoUpdater.logger = log;
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', () => {
    mainWindow?.webContents.send('update_available');
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(mainWindow!, {
      type: 'info',
      buttons: ['Restart', 'Later'],
      title: 'Update Ready',
      message: 'An update has been downloaded. Restart now to apply it?',
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.on('error', (error) => {
    console.error('Update error:', error);
  });
}

app.whenReady().then(() => {
  createWindow();
  checkForUpdates();
});
