import fs from 'fs';
import path from 'path';

import { dialog, ipcMain, shell } from 'electron';
import { app } from 'electron';
import isDev from 'electron-is-dev';

import { IpcSerializableError } from '../IpcSerializableError.js';

import { getLogPath } from './logging.js';
import { buildProject } from './tools/build-project.js';
import { getAppVersion, getEngineVersion } from './tools/common.js';
import { IgnoredFiles } from './tools/const.js';
import { fileServer } from './tools/file-server.js';
import { newProject, TEMPLATES } from './tools/new-project.js';

import type { AppInfo, FileServerStatus, ProjectTemplate, ToolCallingResult } from '../api.js';

ipcMain.handle('fileServer.start', async (_, port: number, rootDir: string): Promise<Error | null> => {
  try {
    await fileServer.start(port, rootDir);
    return null;
  } catch (error) {
    return IpcSerializableError.serialize(error as Error);
  }
});

ipcMain.handle('fileServer.stop', async (): Promise<Error | null> => {
  try {
    await fileServer.stop();
    return null;
  } catch (error) {
    return IpcSerializableError.serialize(error as Error);
  }
});

ipcMain.handle('fileServer.status', async (): Promise<FileServerStatus> => {
  return {
    isRunning: fileServer.isServerRunning(),
    port: fileServer.getPort(),
  };
});

ipcMain.handle('os.chooseDirectory', async (): Promise<string | null> => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  if (canceled) {
    return null;
  } else {
    return filePaths[0];
  }
});

ipcMain.handle('os.openPath', async (_, path: string): Promise<void> => {
  await shell.openPath(path);
});

ipcMain.handle('os.openUrl', async (_, url: string): Promise<void> => {
  await shell.openExternal(url);
});

ipcMain.handle('os.readDirectory', async (_, path: string): Promise<string[] | null> => {
  if (!fs.existsSync(path)) {
    return null;
  }
  return fs.readdirSync(path).filter(file => !IgnoredFiles.includes(file));
});

ipcMain.handle('os.exists', async (_, path: string): Promise<boolean> => {
  return fs.existsSync(path);
});

ipcMain.handle('tools.createProject', async (_, projectPath: string, templateId: string): Promise<ToolCallingResult> => {
  const res = await newProject(projectPath, templateId);
  if (res.error instanceof Error) {
    res.error = IpcSerializableError.serialize(res.error);
  }
  return res;
});

ipcMain.handle('tools.deleteProject', async (_, projectPath: string): Promise<ToolCallingResult> => {
  if (!fs.existsSync(projectPath)) {
    return {
      success: false,
      message: 'Project not found',
    };
  }
  try {
    const entries = fs.readdirSync(projectPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(projectPath, entry.name);
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
    return {
      success: true,
      message: `Project ${projectPath} deleted`,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to delete project',
      error: IpcSerializableError.serialize(error as Error),
    };
  }
});

ipcMain.handle('tools.buildProject', async (_, projectPath: string): Promise<ToolCallingResult> => {
  const res = await buildProject(projectPath);
  if (res.error instanceof Error) {
    res.error = IpcSerializableError.serialize(res.error);
  }
  return res;
});

ipcMain.handle('tools.getProjectTemplates', async (): Promise<ProjectTemplate[]> => {
  return TEMPLATES;
});

ipcMain.handle('app.getInfo', async (): Promise<AppInfo> => {
  return getAppInfo();
});

export function getAppInfo(): AppInfo {
  return {
    isDev: isDev,
    engineVersion: getEngineVersion(),
    appVersion: getAppVersion(),
    appName: app.getName(),
    logPath: getLogPath(),
  };
}
