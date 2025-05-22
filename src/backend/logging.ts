import { BrowserWindow } from 'electron';

class Logger {
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

export const logger = new Logger();
