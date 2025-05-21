interface ElectronAPI {
  selectFolder: () => Promise<string | null>;
}

interface Window {
  electronAPI: ElectronAPI;
}