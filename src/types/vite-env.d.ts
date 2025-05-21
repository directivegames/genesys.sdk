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
  startFileServer: (port: number, rootDir: string) => Promise<ServerStartResult>;
  stopFileServer: () => Promise<ServerStopResult>;
  getFileServerStatus: () => Promise<ServerStatus>;

  // Project management
  newProject: (path: string, template: string) => Promise<ProjectCreateResult>;
  getProjectTemplates: () => Promise<ProjectTemplate[]>;

  // Event listeners
  onFileServerLog: (callback: ServerCallback) => () => void;
  onFileServerError: (callback: ServerCallback) => () => void;
}
