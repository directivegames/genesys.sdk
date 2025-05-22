export type FileServerStatus = {
    isRunning: boolean;
    port: number;
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
};

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

export {};
