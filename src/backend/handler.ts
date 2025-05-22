import { dialog, ipcMain } from 'electron';

import { fileServer } from './file-server.js';
import { newProject, TEMPLATES } from './tools/new-project.js';

import type { CreateProjectResult, FileServerStatus, ProjectTemplate } from '../api.js';


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

ipcMain.handle('os.openDirectory', async (): Promise<string | null> => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  if (canceled) {
    return null;
  } else {
    return filePaths[0];
  }
});

ipcMain.handle('tools.createProject', async (_, projectPath: string, templateId: string): Promise<CreateProjectResult> => {
  return await newProject(projectPath, templateId);
});

ipcMain.handle('tools.getProjectTemplates', async (): Promise<ProjectTemplate[]> => {
  return TEMPLATES;
});

export {};
