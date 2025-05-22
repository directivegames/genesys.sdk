import fs from 'fs';
import path from 'path';

import chokidar from 'chokidar';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import { WebSocketServer } from 'ws';

import { logger } from '../logging.js';

import { buildProject } from './build-project.js';
import { runCommand } from './common.js';
import { IgnoredFiles } from './const.js';

import type { Request as ExpressRequest } from 'express';
import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

interface FileItem {
    name: string;
    path: string;
    absolutePath: string;
    size: number;
    modifiedTime: Date;
}

interface DirectoryListing {
    directories: FileItem[];
    files: FileItem[];
}

class FileServer {
  private server: ReturnType<express.Application['listen']> | null = null;
  private wsServer: WebSocketServer | null = null;
  private port: number = 4000;
  private isRunning: boolean = false;
  private connections = new Set<any>(); // Track all open connections

  constructor() {}

  createApp(rootDir: string): express.Application {
    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use(express.static(rootDir, {
      dotfiles: 'allow'
    }));

    const storage = multer.diskStorage({
      destination: (req: ExpressRequest<ParamsDictionary, any, any, ParsedQs, Record<string, any>>, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
        const uploadPath = req.headers['x-upload-path'] as string || '';
        const absPath: string = path.join(rootDir, uploadPath);
        if (!fs.existsSync(absPath)) {
          fs.mkdirSync(absPath, { recursive: true });
        }
        cb(null, absPath);
      },
      filename: (req: ExpressRequest<ParamsDictionary, any, any, ParsedQs, Record<string, any>>, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        cb(null, file.originalname);
      }
    });

    const upload = multer({ storage });

    app.get('/api/files', (req: Request, res: Response): void => {
      const absPath: string = path.join(rootDir, req.query.path as string || '');
      const recursive: boolean = req.query.recursive === 'true';

      const directories: FileItem[] = [];
      const files: FileItem[] = [];

      if (fs.existsSync(absPath)) {
        if (recursive) {
          const walkDir = (currentPath: string, relativePath: string = ''): void => {
            const items: string[] = fs.readdirSync(currentPath).filter(file => !IgnoredFiles.includes(file));

            items.forEach(item => {
              const itemPath: string = path.join(currentPath, item);
              const itemRelativePath: string = path.join(relativePath, item);
              const stats = fs.statSync(itemPath);
              const normalizedPath: string = itemRelativePath.replace(/\\/g, '/');

              const itemInfo: FileItem = {
                name: item,
                path: normalizedPath,
                absolutePath: itemPath,
                size: stats.size,
                modifiedTime: stats.mtime
              };

              if (stats.isDirectory()) {
                directories.push(itemInfo);
                walkDir(itemPath, itemRelativePath);
              } else {
                files.push(itemInfo);
              }
            });
          };

          walkDir(absPath, path.relative(rootDir, absPath));
        } else {
          const items: string[] = fs.readdirSync(absPath).filter(file => !IgnoredFiles.includes(file));

          items.forEach(item => {
            const filePath: string = path.join(absPath, item);
            const stats = fs.statSync(filePath);
            const relativePath: string = path.relative(rootDir, filePath).replace(/\\/g, '/');

            const itemInfo: FileItem = {
              name: item,
              path: relativePath,
              absolutePath: filePath,
              size: stats.size,
              modifiedTime: stats.mtime
            };

            if (stats.isDirectory()) {
              directories.push(itemInfo);
            } else {
              files.push(itemInfo);
            }
          });
        }
      }

      res.json({
        directories,
        files
      } as DirectoryListing);
    });

    app.post('/api/files', (req: Request, res: Response): void => {
      if (!req.body.path) {
        res.status(400).json({ error: 'File path is required' });
        return;
      }

      const absPath: string = path.join(rootDir, req.body.path);
      const dirPath: string = path.dirname(absPath);

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      fs.writeFileSync(absPath, req.body.content ?? '');
      res.json({ success: true, path: req.body.path });
      logger.log(`File updated: ${absPath}`);
    });

    app.post('/api/files/upload', upload.single('file'), (req: Request, res: Response): void => {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const relativePath: string = path.join(req.headers['x-upload-path'] as string || '', req.file.originalname)
        .replace(/\\/g, '/');
      const absPath: string = path.join(rootDir, relativePath);

      res.json({
        success: true,
        filename: req.file.originalname,
        path: relativePath
      });
      logger.log(`File uploaded: ${absPath}`);
    });

    app.post('/api/build-project', async (req: Request, res: Response): Promise<void> => {
      try {
        const result = await buildProject(rootDir);
        res.json({
          success: result.success,
          message: result.message,
          error: result.error
        });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    app.post('/api/exec', (req: Request, res: Response): void => {
      if (!req.body.command) {
        res.status(400).json({ error: 'No command provided' });
        return;
      }

      logger.log(`Executing command: ${req.body.command}`);
      try {
        runCommand(req.body.command, null);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
        return;
      }

      res.json({
        success: true,
        command: req.body.command
      });
      logger.log(`Command executed: ${req.body.command}`);
    });

    app.delete('/api/files', (req: Request, res: Response): void => {
      if (!req.query.path) {
        res.status(400).json({ error: 'Path is required' });
        return;
      }

      const absPath: string = path.join(rootDir, req.query.path as string);

      if (!fs.existsSync(absPath)) {
        res.status(404).json({ error: 'File or directory not found' });
        return;
      }

      const stats = fs.statSync(absPath);

      if (stats.isDirectory()) {
        fs.rmdirSync(absPath, { recursive: true });
      } else {
        fs.unlinkSync(absPath);
      }
      res.json({ success: true, path: req.query.path });
      logger.log(`File deleted: ${absPath}`);
    });

    return app;
  }

  createWsServer(rootDir: string): WebSocketServer {
    if (!this.server) {
      throw new Error('Server must be initialized before creating WebSocket server');
    }

    const wss = new WebSocketServer({ server: this.server });

    function broadcastChange(type: 'folder' | 'file', filePath: string, action: 'created' | 'modified' | 'deleted') {
      const payload = JSON.stringify({
        type,
        path: filePath,
        action
      });
      wss.clients.forEach(client => {
        if (client.readyState === 1) { // 1 = OPEN
          client.send(payload);
        }
      });
    }

    // Watch for file/folder changes using chokidar
    const watcher = chokidar.watch(rootDir, {
      persistent: true,
      ignoreInitial: true,
      depth: 99,
    });

    watcher
      .on('add', filePath => {
        const rel = path.relative(rootDir, filePath).replace(/\\/g, '/');
        logger.log(`[watcher] add: ${rel}`);
        broadcastChange('file', rel, 'created');
      })
      .on('change', filePath => {
        const rel = path.relative(rootDir, filePath).replace(/\\/g, '/');
        logger.log(`[watcher] change: ${rel}`);
        broadcastChange('file', rel, 'modified');
      })
      .on('unlink', filePath => {
        const rel = path.relative(rootDir, filePath).replace(/\\/g, '/');
        logger.log(`[watcher] unlink: ${rel}`);
        broadcastChange('file', rel, 'deleted');
      })
      .on('addDir', dirPath => {
        const rel = path.relative(rootDir, dirPath).replace(/\\/g, '/');
        logger.log(`[watcher] addDir: ${rel}`);
        broadcastChange('folder', rel, 'created');
      })
      .on('unlinkDir', dirPath => {
        const rel = path.relative(rootDir, dirPath).replace(/\\/g, '/');
        logger.log(`[watcher] unlinkDir: ${rel}`);
        broadcastChange('folder', rel, 'deleted');
      });

    wss.on('connection', ws => {
      logger.log('WebSocket client connected');
      ws.on('close', () => {
        logger.log('WebSocket client disconnected');
      });
    });

    return wss;
  }

  async start(port: number, rootDir: string): Promise<void> {
    if (this.isRunning) {
      await this.stop();
    }

    this.port = port;

    return new Promise<void>((resolve, reject) => {
      try {
        const app = this.createApp(rootDir);
        this.server = app.listen(this.port, () => {
          this.isRunning = true;
          logger.log(`File server started on port ${this.port} at ${rootDir}`);
          resolve();
        });

        // Track all open TCP connections!
        this.server.on('connection', (conn: any) => {
          this.connections.add(conn);
          conn.on('close', () => this.connections.delete(conn));
        });

        this.server.on('error', (err: Error) => {
          this.isRunning = false;
          reject(err);
        });

        this.wsServer = this.createWsServer(rootDir);
      } catch (error: any) {
        reject(error as Error);
      }
    });
  }

  async stop(): Promise<void> {
    if (!this.isRunning || !this.server) {
      return;
    }

    return new Promise<void>((resolve, reject) => {
      try {
        logger.log('Stopping file server...');

        // Close WebSocket server if it exists
        if (this.wsServer) {
          this.wsServer.close();
          this.wsServer = null;
          logger.log('WebSocket server stopped');
        }

        this.server!.close(() => {
          this.isRunning = false;
          this.server = null;
          logger.log('File server stopped');
          resolve();
        });
        logger.log(`Destroying ${this.connections.size} connections.`);
        for (const conn of this.connections) {
          conn.destroy();
        }
        this.connections.clear();
      } catch (error: any) {
        logger.error('Failed to stop file server:', error);
        reject(error as Error);
      }
    });
  }

  isServerRunning() {
    return this.isRunning;
  }

  getPort() {
    return this.port;
  }
}

export const fileServer = new FileServer();
