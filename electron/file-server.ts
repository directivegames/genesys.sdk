import { execSync } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

import cors from 'cors';
import express from 'express';
import multer from 'multer';

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

class FileServer extends EventEmitter {
  private server: ReturnType<express.Application['listen']> | null = null;
  private port: number = 4000;
  private isRunning: boolean = false;

  constructor() {
    super();
  }

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

        // Create directory if it doesn't exist
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
          // Recursive file listing
          const walkDir = (currentPath: string, relativePath: string = ''): void => {
            const items: string[] = fs.readdirSync(currentPath);

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
          // Non-recursive (original implementation)
          const items: string[] = fs.readdirSync(absPath);

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

      // Create directory if it doesn't exist
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      fs.writeFileSync(absPath, req.body.content ?? '');
      res.json({ success: true, path: req.body.path });
      this.log(`File updated: ${absPath}`);
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
      this.log(`File uploaded: ${absPath}`);
    });

    app.post('/api/exec', (req: Request, res: Response): void => {
      if (!req.body.command) {
        res.status(400).json({ error: 'No command provided' });
        return;
      }

      this.log(`Executing command: ${req.body.command}`);
      try {
        execSync(req.body.command);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
        return;
      }

      res.json({
        success: true,
        command: req.body.command
      });
      this.log(`Command executed: ${req.body.command}`);
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
      this.log(`File deleted: ${absPath}`);
    });

    return app;
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
          this.log(`File server started on port ${this.port} at ${rootDir}`);
          resolve();
        });

        this.server.on('error', (err) => {
          this.isRunning = false;
          this.error('Failed to start file server:', err);
          reject(err);
        });
      } catch (error: any) {
        this.error('Failed to start file server:', error);
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    if (!this.isRunning || !this.server) {
      return;
    }

    return new Promise<void>((resolve, reject) => {
      try {
        this.log('Stopping file server...');
        this.server!.close(() => {
          this.isRunning = false;
          this.server = null;
          this.log('File server stopped');
          resolve();
        });
      } catch (error: any) {
        this.error('Failed to stop file server:', error);
        reject(error);
      }
    });
  }

  isServerRunning() {
    return this.isRunning;
  }

  getPort() {
    return this.port;
  }

  log(...params: any[]) {
    console.log(...params);
    this.emit('log', ...params);
  }

  error(...params: any[]) {
    console.error(...params);
    this.emit('error', ...params);
  }
}

export const fileServer = new FileServer();
