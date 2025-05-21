/// <reference types="vite/client" />

export interface ServerStatus {
  running: boolean;
  port?: number;
}

export interface ServerStartResult extends ServerStatus {
  success: boolean;
  error?: string;
}

export interface ServerStopResult {
  success: boolean;
  running: boolean;
  error?: string;
}

export interface ServerStartedEvent {
  port: number;
}

export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  DEBUG = 'debug'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
}

export interface ProjectCreateResult {
  success: boolean;
  message: string;
  error?: string;
}

export type ServerCallback<T = any> = (data: T) => void;

export interface ElectronAPI {
  // Folder selection
  selectFolder: () => Promise<string | null>;

  // Server management
  startServer: (port?: number) => Promise<ServerStartResult>;
  stopServer: () => Promise<ServerStopResult>;
  getServerStatus: () => Promise<ServerStatus>;

  // Server logs
  getServerLogs: () => Promise<LogEntry[]>;

  // Project management
  newProject: (path: string, template: string) => Promise<ProjectCreateResult>;
  getProjectTemplates: () => Promise<ProjectTemplate[]>;

  // Event listeners
  onServerStarted: (callback: ServerCallback<ServerStartedEvent>) => void;
  onServerStopped: (callback: ServerCallback<void>) => void;
  onServerError: (callback: ServerCallback<string>) => void;
  onServerLog: (callback: ServerCallback<LogEntry>) => void;
}

export interface Window {
  electronAPI: ElectronAPI;
}
