export type FileServerStatus = {
    isRunning: boolean;
    port: number;
}

export type ToolCallingResult = {
    success: boolean;
    message: string;
    error?: string;
}

export type ProjectTemplate = {
    id: string;
    name: string;
}

export type LogCallback<T extends any[] = any[]> = (...data: T) => void;

export type ElectronAPI = {
    fileServer: {
        start: (port: number, rootDir: string) => Promise<void>;
        stop: () => Promise<void>;
        status: () => Promise<FileServerStatus>;
    };

    os: {
        chooseDirectory: () => Promise<string | null>;
        openPath: (path: string) => Promise<void>;
        readDirectory: (path: string) => Promise<string[] | null>;
    }

    tools: {
        createProject: (projectPath: string, templateId: string) => Promise<ToolCallingResult>;
        getProjectTemplates: () => Promise<ProjectTemplate[]>;
        buildProject: (projectPath: string) => Promise<ToolCallingResult>;
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
