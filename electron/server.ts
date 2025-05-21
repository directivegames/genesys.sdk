import { EventEmitter } from 'events';

import cors from 'cors';
import express from 'express';

// Log level enum
export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  DEBUG = 'debug'
}

// Log entry interface
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
}

class ServerManager extends EventEmitter {
  private app: express.Application;
  private server: ReturnType<express.Application['listen']> | null = null;
  private port: number = 3000;
  private isRunning: boolean = false;
  private logs: LogEntry[] = [];
  private maxLogEntries: number = 500;

  constructor() {
    super();
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.log(LogLevel.INFO, 'Server manager initialized');
  }

  private setupMiddleware() {
    // Log middleware to capture all requests
    this.app.use((req, res, next) => {
      this.log(LogLevel.INFO, `${req.method} ${req.url}`);
      next();
    });

    this.app.use(cors());
    this.app.use(express.json());
  }

  private setupRoutes() {
    this.app.get('/api/status', (req, res) => {
      this.log(LogLevel.INFO, 'Status endpoint called');
      res.json({ status: 'ok', serverRunning: this.isRunning });
    });

    this.app.get('/api/hello', (req, res) => {
      this.log(LogLevel.INFO, 'Hello endpoint called');
      res.json({ message: 'Hello from Express server!' });
    });

    this.app.get('/api/logs', (req, res) => {
      res.json(this.logs);
    });
  }

  // Logging method
  log(level: LogLevel, message: string) {
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = { timestamp, level, message };

    // Add to logs array
    this.logs.push(logEntry);

    // Trim logs if they exceed max entries
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(-this.maxLogEntries);
    }

    // Output to console
    console[level](message);

    // Emit log event
    this.emit('log', logEntry);

    return logEntry;
  }

  // Get all logs
  getLogs() {
    return this.logs;
  }

  setPort(port: number) {
    this.port = port;
    this.log(LogLevel.INFO, `Port set to ${port}`);
    return this;
  }

  start() {
    if (this.isRunning) {
      this.log(LogLevel.ERROR, 'Server is already running');
      this.emit('error', new Error('Server is already running'));
      return false;
    }

    try {
      this.log(LogLevel.INFO, `Starting server on port ${this.port}...`);
      this.server = this.app.listen(this.port, () => {
        this.isRunning = true;
        this.log(LogLevel.INFO, `Server started on port ${this.port}`);
        this.emit('started', { port: this.port });
      });

      this.server.on('error', (err) => {
        this.isRunning = false;
        this.log(LogLevel.ERROR, `Server error: ${err.message}`);
        this.emit('error', err);
      });

      return true;
    } catch (error: any) {
      this.log(LogLevel.ERROR, `Failed to start server: ${error.message}`);
      this.emit('error', error);
      return false;
    }
  }

  stop() {
    if (!this.isRunning || !this.server) {
      this.log(LogLevel.ERROR, 'Server is not running');
      this.emit('error', new Error('Server is not running'));
      return false;
    }

    try {
      this.log(LogLevel.INFO, 'Stopping server...');
      this.server.close(() => {
        this.isRunning = false;
        this.server = null;
        this.log(LogLevel.INFO, 'Server stopped');
        this.emit('stopped');
      });

      return true;
    } catch (error: any) {
      this.log(LogLevel.ERROR, `Failed to stop server: ${error.message}`);
      this.emit('error', error);
      return false;
    }
  }

  isServerRunning() {
    return this.isRunning;
  }

  getPort() {
    return this.port;
  }
}

export const serverManager = new ServerManager();