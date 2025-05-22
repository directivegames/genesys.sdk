import fs from 'fs';
import path from 'path';

import { JSDOM } from 'jsdom';


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
