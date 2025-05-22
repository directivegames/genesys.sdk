import fs from 'fs';
import path from 'path';

import * as ENGINE from 'genesys.js';

import { logger } from '../logging.js';

import { getEngineVersion, getProjectRoot, runCommand } from './common.js';
import { DEFAULT_GAME_NAME, DEFAULT_SCENE_NAME, IgnoredFiles } from './const.js';
import * as T from './project-templates/index.js';

import type { ProjectTemplate, ToolCallingResult } from '../../api.js';


T.loadTemplates();

// Available project templates
export const TEMPLATES: ProjectTemplate[] = [
  { id: 'FreeCameraGameTemplate', name: 'Free Camera' },
  { id: 'FirstPersonGameTemplate', name: 'First Person' },
  { id: 'ThirdPersonGameTemplate', name: 'Third Person' },
];

const projectFiles = {
  packageJson: {
    scripts: {
      build: 'tsc',
      postinstall: 'npx tsx ./src/post-install.ts',
    },
    keywords: [],
    type: 'module',
    dependencies: {
      'genesys.js': `^${getEngineVersion()}`
    },
    devDependencies: {
      '@types/node': '^22.15.21',
      typescript: '^5.8.3',
      esbuild: '^0.25.4'
    }
  },

  codeWorkspace: {
    folders: [
      {
        path: '.'
      }
    ],
    settings: {}
  }
};

export async function newProject(projectPath: string, templateId: string): Promise<ToolCallingResult> {
  logger.log(`Creating project at ${projectPath} using ${templateId} template`);
  try {
    if (fs.existsSync(projectPath)) {
      // Check if directory is empty
      const files = fs.readdirSync(projectPath).filter(file => !IgnoredFiles.includes(file));
      if (files.length > 0) {
        return {
          success: false,
          message: `The directory ${projectPath} already contains files. Please choose an empty directory.`
        };
      }
    } else {
      fs.mkdirSync(projectPath, { recursive: true });
    }
    logger.log('Creating default scene and game code...');
    const templateName = 'GAME.' + templateId;
    const templateClass = ENGINE.ClassRegistry.getClass(templateName);
    const template: T.IGameTemplate = new templateClass();
    fs.writeFileSync(path.join(projectPath, DEFAULT_GAME_NAME), template.getGameCode());
    fs.writeFileSync(path.join(projectPath, DEFAULT_SCENE_NAME), JSON.stringify(template.getWorld().asExportedObject(), null, 2));
    await template.additionalSetup();

    logger.log('Creating project files...');
    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify(projectFiles.packageJson, null, 2));
    const projectName = path.basename(projectPath).replace(' ', '-');
    fs.writeFileSync(path.join(projectPath, `${projectName}.code-workspace`), JSON.stringify(projectFiles.codeWorkspace, null, 2));

    const isDev = process.env.NODE_ENV === 'development';
    const projectSource = isDev ? path.join(getProjectRoot(), 'assets/new-project') : path.join(process.resourcesPath, 'app.asar.unpacked/assets/new-project');
    logger.log('Copying other project files...');
    fs.cpSync(projectSource, projectPath, { recursive: true });

    logger.log('Running npm install and npm run build...');
    runCommand('npm install', projectPath);
    runCommand('npm run build', projectPath);

    logger.log('Project created successfully');

    return {
      success: true,
      message: `Project created successfully at ${projectPath} using ${templateId} template`
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to create project: ${error}`,
      error: error as Error,
    };
  }
}
