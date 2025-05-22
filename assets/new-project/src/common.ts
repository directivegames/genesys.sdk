import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export function mockEsModule() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  (global as any).__filename = __filename;
  (global as any).__dirname = __dirname;
}

mockEsModule();

export function getProjectRoot() {
  let currentDir = __dirname;
  while (true) {
    if (fs.existsSync(path.join(currentDir, 'package.json'))) {
      return currentDir;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      throw new Error('Project root not found');
    }
    currentDir = parentDir;
  }
}
