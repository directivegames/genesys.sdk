import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { JSDOM } from 'jsdom';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function mockBrowserEnvironment() {
  const dom = new JSDOM('<!DOCTYPE html><p>Hello world</p>');
  (global as any).window = dom.window;
  (global as any).document = dom.window.document;
  (global as any).HTMLElement = dom.window.HTMLElement;
  if (navigator) {
    navigator.getGamepads = () => [];
  }
}

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

export function checkEngineVersion(engineVersion?: string) {
  const pkg = JSON.parse(fs.readFileSync(path.join(getProjectRoot(), 'node_modules/genesys.js/package.json'), 'utf8'));
  if (engineVersion && engineVersion !== pkg.version) {
    throw new Error(`Engine version ${pkg.version} does not match ${engineVersion}`);
  }
}

export function runCommand(command: string, workingDir: string | null) {
  const isMac = process.platform === 'darwin';
  const originalDir = process.cwd();
  try {
    if (workingDir) {
      process.chdir(workingDir);
    }

    if (isMac) {
      const env = Object.assign({}, process.env, {
        PATH: [
          '/usr/local/bin',
          process.env.PATH,
        ].join(':')
      });
      execSync(command, { stdio: 'inherit', env });
    } else {
      execSync(command, { stdio: 'inherit' });
    }
  } finally {
    process.chdir(originalDir);
  }
}

export function getEngineVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(getProjectRoot(), 'node_modules/genesys.js/package.json'), 'utf8'));
  return pkg.version;
}
