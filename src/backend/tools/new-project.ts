import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import * as ENGINE from 'genesys.js';

import { DEFAULT_GAME_NAME, DEFAULT_SCENE_NAME, IgnoredFiles } from '../const.js';
import { logger } from '../logging.js';

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
  packageJson: `
  {
    "scripts": {
      "build": "tsc"
    },
    "keywords": [],
    "type": "module",
    "dependencies": {
      "genesys.js": "^0.0.102"
    },
    "devDependencies": {
      "typescript": "^5.8.3"
    }
  }
  `,
  tsconfigJson: `
  {
    "compilerOptions": {
      "target": "ES2020",
      "useDefineForClassFields": true,
      "module": "ESNext",
      "lib": ["ES2020", "DOM"],
      "skipLibCheck": true,
      "moduleResolution": "bundler",
      "resolveJsonModule": true,
      "isolatedModules": true,
      "jsx": "preserve",
      "strict": true,
      "noUnusedLocals": false,
      "noUnusedParameters": false,
      "noFallthroughCasesInSwitch": true,
      "outDir": "./dist",
      "rootDir": ".",
      "declaration": true,
      "inlineSourceMap": true,
      "experimentalDecorators": true,
      "noImplicitOverride": true,
      "noEmit": true
    },
    "include": ["."],
    "exclude": [".engine", "dist"]
  }
  `,
  gameCodeWorkspace: `
  {
    "folders": [
      {
        "path": "."
      }
    ],
    "settings": {}
  }
  `
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

/**
 * Run npm commands in the specified directory
 */
function runNpmCommands(directory: string, commands: string[]): void {
  const originalDir = process.cwd();
  try {
    // Change to project directory
    process.chdir(directory);

    // Run each command
    for (const command of commands) {
      console.log(`Running '${command}' in ${directory}...`);
      execSync(command, { stdio: 'inherit' });
    }
  } finally {
    // Return to original directory
    process.chdir(originalDir);
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
          message: 'Project directory is not empty',
          error: `The directory ${projectPath} already contains files. Please choose an empty directory.`
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
    fs.writeFileSync(path.join(projectPath, 'package.json'), projectFiles.packageJson);
    fs.writeFileSync(path.join(projectPath, 'tsconfig.json'), projectFiles.tsconfigJson);
    fs.writeFileSync(path.join(projectPath, 'game.code-workspace'), projectFiles.gameCodeWorkspace);

    logger.log('Running npm install and npm run build...');
    runNpmCommands(projectPath, ['npm install', 'npm run build']);

    logger.log('Project created successfully');

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
