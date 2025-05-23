export type FileServerStatus = {
    isRunning: boolean;
    port: number;
}

export type ToolCallingResult = {
    success: boolean;
    message: string;
    error?: string | Error;
}

export type ProjectTemplate = {
    id: string;
    name: string;
}

export type LogCallback<T extends any[] = any[]> = (...data: T) => void;

export type ElectronAPI = {
    fileServer: {
        start: (port: number, rootDir: string) => Promise<Error | null>;
        stop: () => Promise<Error | null>;
        status: () => Promise<FileServerStatus>;
    };

    os: {
        chooseDirectory: () => Promise<string | null>;
        openPath: (path: string) => Promise<void>;
        readDirectory: (path: string) => Promise<string[] | null>;
        exists: (path: string) => Promise<boolean>;
    }

    tools: {
        createProject: (projectPath: string, templateId: string) => Promise<ToolCallingResult>;
        deleteProject: (projectPath: string) => Promise<ToolCallingResult>;
        getProjectTemplates: () => Promise<ProjectTemplate[]>;
        buildProject: (projectPath: string) => Promise<ToolCallingResult>;
        getEngineVersion: () => Promise<string>;
        getAppVersion: () => Promise<string>;
    }

    logging: {
        onLog: (callback: LogCallback) => () => void;
        onError: (callback: LogCallback) => () => void;
        onWarn: (callback: LogCallback) => () => void;
    }
};

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

export {};
