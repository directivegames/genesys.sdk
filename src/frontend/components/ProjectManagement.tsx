import { useEffect, useState } from 'react';

type ProjectState = {
  selectedDirectory: string | null;
  serverStatus: {
    isRunning: boolean;
    port: number;
  };
  error: string | null;
};

export const ProjectManagement = () => {
  const [projectState, setProjectState] = useState<ProjectState>({
    selectedDirectory: null,
    serverStatus: {
      isRunning: false,
      port: 4000,
    },
    error: null,
  });

  // Check server status on component mount
  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const status = await window.electronAPI.fileServer.status();
        setProjectState(prev => ({
          ...prev,
          serverStatus: status,
          error: null,
        }));
      } catch (error) {
        console.error('Error checking server status:', error);
      }
    };

    checkServerStatus();

    // Set up interval to check status every 5 seconds
    const interval = setInterval(checkServerStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenDirectory = async () => {
    try {
      const directory = await window.electronAPI.os.openDirectory();
      if (directory) {
        setProjectState(prev => ({
          ...prev,
          selectedDirectory: directory,
          error: null,
        }));
      }
    } catch (error) {
      console.error('Error opening directory:', error);
      setProjectState(prev => ({
        ...prev,
        error: 'Failed to open directory',
      }));
    }
  };

  const handleToggleServer = async () => {
    try {
      setProjectState(prev => ({ ...prev, error: null }));

      if (!projectState.serverStatus.isRunning) {
        if (!projectState.selectedDirectory) {
          setProjectState(prev => ({
            ...prev,
            error: 'Please select a directory first',
          }));
          return;
        }

        await window.electronAPI.fileServer.start(
          projectState.serverStatus.port,
          projectState.selectedDirectory
        );
      } else {
        await window.electronAPI.fileServer.stop();

        // Force update the status
        setTimeout(async () => {
          const status = await window.electronAPI.fileServer.status();
          setProjectState(prev => ({
            ...prev,
            serverStatus: status,
          }));
        }, 1500); // Give it some time to fully stop
      }

      const status = await window.electronAPI.fileServer.status();
      setProjectState(prev => ({
        ...prev,
        serverStatus: status,
      }));
    } catch (error) {
      console.error('Error toggling server:', error);
      setProjectState(prev => ({
        ...prev,
        error: 'Failed to toggle server',
      }));
    }
  };

  return (
    <div className="project-management">
      <h2>Project Management</h2>

      {projectState.error && (
        <div className="error-message">
          {projectState.error}
        </div>
      )}

      <div className="controls">
        <div className="control-group">
          <button onClick={handleOpenDirectory}>
            Open Directory
          </button>
          <div className="selected-directory">
            {projectState.selectedDirectory ? (
              <span>{projectState.selectedDirectory}</span>
            ) : (
              <span className="placeholder">No directory selected</span>
            )}
          </div>
        </div>

        <div className="control-group">
          <button
            onClick={handleToggleServer}
            className={projectState.serverStatus.isRunning ? 'stop' : 'start'}
          >
            {projectState.serverStatus.isRunning
              ? `Stop Server (Port: ${projectState.serverStatus.port})`
              : 'Start Server'}
          </button>
          <div className="server-status">
            Status: {projectState.serverStatus.isRunning ? 'Running' : 'Stopped'}
          </div>
        </div>
      </div>
    </div>
  );
};