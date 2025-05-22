import fs from 'fs';
import path from 'path';

import * as ENGINE from 'genesys.js';

import { logger } from '../logging.js';

import { getEngineVersion, runCommand } from './common.js';
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
  gitignore: `
  dist
  node_modules
  `,

  packageJson: {
    scripts: {
      build: 'tsc'
    },
    keywords: [],
    type: 'module',
    dependencies: {
      'genesys.js': `^${getEngineVersion()}`
    },
    devDependencies: {
      typescript: '^5.8.3',
      esbuild: '^0.25.4'
    }
  },

  tsconfigJson:{
    compilerOptions: {
      target: 'ES2020',
      useDefineForClassFields: true,
      module: 'ESNext',
      lib: ['ES2020', 'DOM'],
      skipLibCheck: true,
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: 'preserve',
      strict: true,
      noUnusedLocals: false,
      noUnusedParameters: false,
      noFallthroughCasesInSwitch: true,
      outDir: './dist',
      rootDir: '.',
      declaration: true,
      inlineSourceMap: true,
      experimentalDecorators: true,
      noImplicitOverride: true,
      noEmit: true
    },
    include: ['.', 'dist'],
    exclude: ['.engine', 'dist']
  },

  gameCodeWorkspace:{
    folders: [
      {
        path: '.'
      }
    ],
    settings: {}
  }
};

/**
 * Recursively copy files from source to destination
 */
function copyFolderSync(source: string, destination: string): void {
  // Create destination folder if it doesn't exist
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  // Read all files/folders from source
  const files = fs.readdirSync(source);

  // Copy each file/folder
  for (const file of files) {
    const sourcePath = path.join(source, file);
    const destPath = path.join(destination, file);

    // Check if it's a file or directory
    if (fs.statSync(sourcePath).isDirectory()) {
      // Recursively copy directory
      copyFolderSync(sourcePath, destPath);
    } else {
      // Copy file
      fs.copyFileSync(sourcePath, destPath);
    }
  }
}

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
    fs.writeFileSync(path.join(projectPath, '.gitignore'), projectFiles.gitignore);
    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify(projectFiles.packageJson, null, 2));
    fs.writeFileSync(path.join(projectPath, 'tsconfig.json'), JSON.stringify(projectFiles.tsconfigJson, null, 2));
    fs.writeFileSync(path.join(projectPath, 'game.code-workspace'), JSON.stringify(projectFiles.gameCodeWorkspace, null, 2));

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
