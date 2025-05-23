import path from 'path';
import { fileURLToPath } from 'url';

import { app, BrowserWindow, Menu } from 'electron';
import './handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV === 'development';

const createWindow = async () => {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js'),
    },
  });

  // Enable context menu
  win.webContents.on('context-menu', (event, params) => {
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
          win.webContents.inspectElement(params.x, params.y);
        },
      },
    ]);
    menu.popup();
  });

  if (isDev) {
    await win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    await win.loadFile(path.join(__dirname, '../index.html'));
  }
};

app.whenReady().then(createWindow);
