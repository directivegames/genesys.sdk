export type FileServerStatus = {
    isRunning: boolean;
    port: number;
}

export type CreateProjectResult = {
    success: boolean;
    message: string;
    error?: string;
}

export type ProjectTemplate = {
    id: string;
    name: string;
}

export type ElectronAPI = {
    ping: () => Promise<string>;
    fileServer: {
        start: (port: number, rootDir: string) => Promise<void>;
        stop: () => Promise<void>;
        status: () => Promise<FileServerStatus>;
    };
    os: {
        openDirectory: () => Promise<string | null>;
    }
    tools: {
        createProject: (projectPath: string, templateId: string) => Promise<CreateProjectResult>;
        getProjectTemplates: () => Promise<ProjectTemplate[]>;
    }
};

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

export {};
