import fs from 'fs';
import path from 'path';

import { getProjectRoot } from './common.js';


async function main() {
  const engineInstallFolder = path.join(getProjectRoot(), 'node_modules/genesys.js');
  const copiedEngineFolder = path.join(getProjectRoot(), '.engine');
  const engineRulesFolder = path.join(engineInstallFolder, '.cursor/rules');
  const localRulesFolder = path.join(getProjectRoot(), '.cursor/rules');
  const filesToCopy = [
    'clean-code.mdc',
    'code-quality.mdc',
    'typescript.mdc',
    'code-snippets.mdc',
  ];
  
  fs.mkdirSync(localRulesFolder, { recursive: true });
  for (const file of filesToCopy) {
    const engineFilePath = path.join(engineRulesFolder, file);
    const localFilePath = path.join(localRulesFolder, file);    
    fs.copyFileSync(engineFilePath, localFilePath);
  }

  if (fs.existsSync(copiedEngineFolder)) {
    fs.rmdirSync(copiedEngineFolder, { recursive: true });
  }
  fs.mkdirSync(copiedEngineFolder, { recursive: true });

  const foldersToCopy: string[] = [
    'definitions',
    'games',
    'src',
  ];
  for (const folder of foldersToCopy) {
    const engineFolderPath = path.join(engineInstallFolder, folder);
    const localFolderPath = path.join(copiedEngineFolder, folder);
    fs.cpSync(engineFolderPath, localFolderPath, { recursive: true });
  }
}

main();
