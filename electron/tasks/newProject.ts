
import fs from 'fs/promises';
import path from 'path';

import * as ENGINE from 'genesys.js';



import { DEFAULT_GAME_NAME, DEFAULT_SCENE_NAME } from './const.js';
import * as T from './templates/index.js';

import type { ProjectCreateResult } from '../../src/vite-env';

T.loadTemplates();

// Available project templates
export const TEMPLATES = [
  { id: 'FreeCameraGameTemplate', name: 'Free Camera' },
  { id: 'FirstPersonGameTemplate', name: 'First Person' },
  { id: 'ThirdPersonGameTemplate', name: 'Third Person' },
];

export async function newProject(projectPath: string, templateId: string): Promise<ProjectCreateResult> {
  try {
    const templateName = 'GAME.' + templateId;
    const templateClass = ENGINE.ClassRegistry.getClass(templateName);
    const template: T.IGameTemplate = new templateClass();
    await fs.writeFile(path.join(projectPath, DEFAULT_GAME_NAME), template.getGameCode());
    await fs.writeFile(path.join(projectPath, DEFAULT_SCENE_NAME), JSON.stringify(template.getWorld().asExportedObject(), null, 2));
    await template.additionalSetup();

    return {
      success: true,
      message: `Project created successfully at ${projectPath} using ${templateId} template`
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to create project',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
