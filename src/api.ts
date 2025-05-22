export type ElectronAPI = {
    ping: () => Promise<string>;
};

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

export {};
