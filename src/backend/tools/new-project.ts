import fs from 'fs';
import path from 'path';

import * as ENGINE from 'genesys.js';

import { DEFAULT_GAME_NAME, DEFAULT_SCENE_NAME } from './const.js';
import * as T from './project-templates/index.js';

import type { CreateProjectResult, ProjectTemplate } from '../../api.js';

T.loadTemplates();

// Available project templates
export const TEMPLATES: ProjectTemplate[] = [
  { id: 'FreeCameraGameTemplate', name: 'Free Camera' },
  { id: 'FirstPersonGameTemplate', name: 'First Person' },
  { id: 'ThirdPersonGameTemplate', name: 'Third Person' },
];

export async function newProject(projectPath: string, templateId: string): Promise<CreateProjectResult> {
  try {
    if (fs.existsSync(projectPath)) {
      // Check if directory is empty
      const files = fs.readdirSync(projectPath);
      if (files.length > 0) {
        return {
          success: false,
          message: 'Project directory is not empty',
          error: `The directory ${projectPath} already contains files. Please choose an empty directory.`
        };
      }
    } else {
      fs.mkdirSync(projectPath, { recursive: true });
    }
    const templateName = 'GAME.' + templateId;
    const templateClass = ENGINE.ClassRegistry.getClass(templateName);
    const template: T.IGameTemplate = new templateClass();
    fs.writeFileSync(path.join(projectPath, DEFAULT_GAME_NAME), template.getGameCode());
    fs.writeFileSync(path.join(projectPath, DEFAULT_SCENE_NAME), JSON.stringify(template.getWorld().asExportedObject(), null, 2));
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
