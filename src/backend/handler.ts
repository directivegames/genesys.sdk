import fs from 'fs';

import { dialog, ipcMain, shell } from 'electron';

import { IpcSerializableError } from '../IpcSerializableError.js';

import { buildProject } from './tools/build-project.js';
import { getAppVersion, getEngineVersion } from './tools/common.js';
import { IgnoredFiles } from './tools/const.js';
import { fileServer } from './tools/file-server.js';
import { newProject, TEMPLATES } from './tools/new-project.js';

import type { FileServerStatus, ProjectTemplate, ToolCallingResult } from '../api.js';

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

ipcMain.handle('tools.getEngineVersion', async (): Promise<string> => {
  return getEngineVersion();
});

ipcMain.handle('tools.getAppVersion', async (): Promise<string> => {
  return getAppVersion();
});

export {};
