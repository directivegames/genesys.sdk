import fs from 'fs';
import path from 'path';

import { logger } from '../logging.js';

import { runCommand } from './common.js';
import {
  BUILT_PROJECT_FOLDER,
  DEFAULT_GAME_BUNDLE_NAME,
  DEFAULT_GAME_NAME,
  DEFAULT_SCENE_NAME,
  PROJECT_PREFIX
} from './const.js';

import type { ToolCallingResult } from '../../api.js';


export async function buildProject(projectPath: string): Promise<ToolCallingResult> {
  try {
    logger.log(`Building project at ${projectPath}`);

    if (!fs.existsSync(projectPath)) {
      return {
        success: false,
        message: `Project does not exist: ${projectPath}`,
      };
    }

    const gameFilePath = path.join(projectPath, DEFAULT_GAME_NAME);
    const sceneFilePath = path.join(projectPath, DEFAULT_SCENE_NAME);

    if (!fs.existsSync(gameFilePath)) {
      return {
        success: false,
        message: `Game file ${gameFilePath} does not exist`,
      };
    }
    if (!fs.existsSync(sceneFilePath)) {
      return {
        success: false,
        message: `Scene file ${sceneFilePath} does not exist`,
      };
    }

    const distFolder = path.join(projectPath, BUILT_PROJECT_FOLDER);
    if (fs.existsSync(distFolder)) {
      fs.rmSync(distFolder, { recursive: true });
    }
    fs.mkdirSync(distFolder, { recursive: true });

    const gameBundleFilePath = path.join(distFolder, DEFAULT_GAME_BUNDLE_NAME);
    const buildCommand = `npx esbuild "${gameFilePath}" --bundle --platform=browser --minify --keep-names --outfile="${gameBundleFilePath}" --external:genesys.js --external:three --format=cjs`;
    logger.log(`Building game bundle from ${gameFilePath}`);
    runCommand(buildCommand, projectPath);

    // inject the prefabs into the scene
    const sceneData = JSON.parse(fs.readFileSync(sceneFilePath, 'utf8'));
    sceneData.prefabs = {};
    for (const actor of sceneData.actors) {
      const prefabName = actor.ctor?.prefabName;
      if (prefabName) {
        const prefabPath = prefabName.replace(PROJECT_PREFIX, projectPath);
        if (!fs.existsSync(prefabPath)) {
          throw new Error(`Prefab ${prefabPath} does not exist`);
        }
        const prefabData = JSON.parse(fs.readFileSync(prefabPath, 'utf8'));
        sceneData.prefabs[prefabName] = prefabData;
      }
    }
    const sceneDestinationPath = path.join(distFolder, DEFAULT_SCENE_NAME);
    fs.writeFileSync(sceneDestinationPath, JSON.stringify(sceneData));

    logger.log(`Project built successfully at ${distFolder}`);

    return {
      success: true,
      message: `Project built successfully at ${distFolder}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to build project: ${error}`,
      error: error as Error,
    };
  }
}
