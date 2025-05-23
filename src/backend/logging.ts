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
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = (...args: any[]) => {
    // originalLog(...args);
    log.log(...args);
  };

  console.error = (...args: any[]) => {
    // originalError(...args);
    log.error(...args);
  };

  console.warn = (...args: any[]) => {
    // originalWarn(...args);
    log.warn(...args);
  };
}


export const logger = new BackendLogger();
