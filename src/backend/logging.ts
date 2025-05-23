import fs from 'fs';
import path from 'path';

import { app, BrowserWindow } from 'electron';
import log from 'electron-log';


class BackendLogger {
  log(...params: any[]) {
    console.log(...params);
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('log', ...params);
    });
  }

  error(...params: any[]) {
    console.error(...params);
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('error', ...params);
    });
  }

  warn(...params: any[]) {
    console.warn(...params);
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('warn', ...params);
    });
  }
}

export function getLogPath() {
  return path.join(app.getPath('userData'), 'logs', `${app.getName()}.log`);
}

export function configureLogging() {
  const logPath = getLogPath();
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  log.transports.file.resolvePathFn = () => logPath;
  log.initialize();
  console.log = log.log;
  console.error = log.error;
  console.warn = log.warn;
}


export const logger = new BackendLogger();
