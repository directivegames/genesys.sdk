/// <reference types="vite/client" />

interface ServerStatus {
  running: boolean;
  port?: number;
}

interface ServerStartResult extends ServerStatus {
  success: boolean;
  error?: string;
}

interface ServerStopResult {
  success: boolean;
  running: boolean;
  error?: string;
}

interface ServerStartedEvent {
  port: number;
}

enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  DEBUG = 'debug'
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
}

type ServerCallback<T = any> = (data: T) => void;

interface ElectronAPI {
  // Folder selection
  selectFolder: () => Promise<string | null>;

  // Server management
  startServer: (port?: number) => Promise<ServerStartResult>;
  stopServer: () => Promise<ServerStopResult>;
  getServerStatus: () => Promise<ServerStatus>;

  // Server logs
  getServerLogs: () => Promise<LogEntry[]>;

  // Event listeners
  onServerStarted: (callback: ServerCallback<ServerStartedEvent>) => void;
  onServerStopped: (callback: ServerCallback<void>) => void;
  onServerError: (callback: ServerCallback<string>) => void;
  onServerLog: (callback: ServerCallback<LogEntry>) => void;
}

interface Window {
  electronAPI: ElectronAPI;
}
