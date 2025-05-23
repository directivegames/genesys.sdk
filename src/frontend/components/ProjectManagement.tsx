import { LoadingButton } from '@mui/lab';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, InputLabel, MenuItem, Select, Snackbar } from '@mui/material';
import { useEffect, useRef, useState } from 'react';

import { IpcSerializableError } from '../../IpcSerializableError.js';

import type { AppInfo, ProjectTemplate } from '../../api.js';
import type { SelectChangeEvent} from '@mui/material';

type LogLevel = 'info' | 'success' | 'error' | 'warning';

type LogEntry = {
  timestamp: Date;
  message: string;
  level: LogLevel;
};

type ProjectState = {
  selectedDirectory: string | null;
  directoryContents: string[] | null;
  serverStatus: {
    isRunning: boolean;
    port: number;
  };
  templates: ProjectTemplate[];
  selectedTemplate: string | null;
  isCreatingProject: boolean;
  isBuildingProject: boolean;
  isDeletingProject: boolean;
  deleteConfirmOpen: boolean;
  notification: {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  };
  logs: LogEntry[];
  leftPanelWidth: number;
  isDragging: boolean;
  appInfo: AppInfo | null;
};

// Constants for localStorage
const STORAGE_KEY_DIRECTORY = 'genesys_last_directory';
const STORAGE_KEY_PANEL_WIDTH = 'genesys_panel_width';
const DEFAULT_LEFT_PANEL_WIDTH = 300; // Default width in pixels

export const ProjectManagement = () => {
  const [projectState, setProjectState] = useState<ProjectState>({
    selectedDirectory: localStorage.getItem(STORAGE_KEY_DIRECTORY),
    directoryContents: null,
    serverStatus: {
      isRunning: false,
      port: 4000,
    },
    templates: [],
    selectedTemplate: null,
    isCreatingProject: false,
    isBuildingProject: false,
    isDeletingProject: false,
    deleteConfirmOpen: false,
    notification: {
      open: false,
      message: '',
      severity: 'info'
    },
    logs: [],
    leftPanelWidth: parseInt(localStorage.getItem(STORAGE_KEY_PANEL_WIDTH) ?? DEFAULT_LEFT_PANEL_WIDTH.toString(), 10),
    isDragging: false,
    appInfo: null
  });

  const logEndRef = useRef<HTMLDivElement>(null);
  const resizeDividerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when logs update
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [projectState.logs]);

  // Setup resize event handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!projectState.isDragging) return;

      // Get the parent element's left position
      const parentRect = resizeDividerRef.current?.parentElement?.getBoundingClientRect();
      if (!parentRect) return;

      // Calculate the new width based on mouse position
      const newWidth = Math.max(200, Math.min(e.clientX - parentRect.left, parentRect.width - 200));

      setProjectState(prev => ({
        ...prev,
        leftPanelWidth: newWidth
      }));
    };

    const handleMouseUp = () => {
      if (!projectState.isDragging) return;

      setProjectState(prev => ({
        ...prev,
        isDragging: false
      }));

      // Save the width to localStorage
      localStorage.setItem(STORAGE_KEY_PANEL_WIDTH, projectState.leftPanelWidth.toString());
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [projectState.isDragging, projectState.leftPanelWidth]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setProjectState(prev => ({
      ...prev,
      isDragging: true
    }));
  };

  // Setup electron logging
  useEffect(() => {
    const removeLogListener = window.electronAPI.logging.onLog((...args) => {
      addLog('info', '[Electron]', ...args);
    });

    const removeErrorListener = window.electronAPI.logging.onError((...args) => {
      addLog('error', '[Electron]', ...args);
    });

    const removeWarnListener = window.electronAPI.logging.onWarn((...args) => {
      addLog('warning', '[Electron]', ...args);
    });

    return () => {
      removeLogListener();
      removeErrorListener();
      removeWarnListener();
    };
  }, []);

  const addLog = (level: LogLevel = 'info', ...rawArgs: any[]) => {
    const args = rawArgs.map(arg => IpcSerializableError.deserialize(arg));

    const formatArg = (arg: any): string => {
      if (arg === null)            return 'null';
      if (arg === undefined)       return 'undefined';

      if (arg instanceof Error) {
        const header = `${arg.name}: ${arg.message}`;
        return arg.stack ? `${header}\n${arg.stack}` : header;
      }

      if (typeof arg === 'object') {
        try { return JSON.stringify(arg, null, 2); }
        catch { return '[Object]'; }
      }

      return String(arg);
    };

    switch (level) {
      case 'success':
      case 'info':
        console.log(...args);
        break;
      case 'warning':
        console.warn(...args);
        break;
      case 'error':
        console.error(...args);
        break;
    }

    const message = args.map(formatArg).join(' ');

    setProjectState(prev => ({
      ...prev,
      logs: [
        ...prev.logs,
        {
          timestamp: new Date(),
          message,
          level,
        },
      ],
    }));
  };

  // Check server status on component mount and fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        addLog('info', 'Fetching available project templates...');
        const templates = await window.electronAPI.tools.getProjectTemplates();
        setProjectState(prev => ({
          ...prev,
          templates,
          selectedTemplate: templates.length > 0 ? templates[0].id : null,
        }));
        addLog('success', `Found ${templates.length} project templates`);
      } catch (error) {
        addLog('error', 'Error fetching project templates', error);
      }
    };

    const fetchAppInfo = async () => {
      try {
        const appInfo = await window.electronAPI.app.getInfo();
        setProjectState(prev => ({
          ...prev,
          appInfo,
        }));
      } catch (error) {
        addLog('error', 'Error fetching app info', error);
      }
    };

    addLog('info', 'Initializing Genesys SDK');
    fetchTemplates();
    fetchAppInfo();

    const loadLastUsedDirectory = async () => {
      if (projectState.selectedDirectory) {
        if (await window.electronAPI.os.exists(projectState.selectedDirectory)) {
          addLog('info', `Loaded last used directory: ${projectState.selectedDirectory}`);
          readSelectedDirectory(projectState.selectedDirectory);
        } else {
          setProjectState(prev => ({
            ...prev,
            selectedDirectory: null,
          }));
        }
      }
    };
    loadLastUsedDirectory();
  }, []);

  const readSelectedDirectory = async (directory: string) => {
    try {
      const contents = await window.electronAPI.os.readDirectory(directory);
      setProjectState(prev => ({
        ...prev,
        directoryContents: contents,
      }));

      if (contents && contents.length > 0) {
        addLog('info', `Directory contains ${contents.length} items`);
      } else {
        addLog('info', 'Directory is empty');
      }
    } catch (error) {
      addLog('error', 'Failed to read directory contents', error);
      setProjectState(prev => ({
        ...prev,
        directoryContents: null,
      }));
    }
  };

  const handleChooseDirectory = async () => {
    try {
      const directory = await window.electronAPI.os.chooseDirectory();
      if (directory) {
        // Save to localStorage
        localStorage.setItem(STORAGE_KEY_DIRECTORY, directory);

        setProjectState(prev => ({
          ...prev,
          selectedDirectory: directory,
        }));

        addLog('success', `Selected and saved directory: ${directory}`);

        // Read directory contents
        await readSelectedDirectory(directory);
      } else {
        // User canceled directory selection
      }
    } catch (error) {
      addLog('error', 'Failed to open directory', error);
    }
  };

  const handleToggleServer = async () => {
    try {
      if (!projectState.serverStatus.isRunning) {
        if (!projectState.selectedDirectory) {
          throw new Error('No directory selected');
        }

        const error = await window.electronAPI.fileServer.start(
          projectState.serverStatus.port,
          projectState.selectedDirectory
        );
        if (error) {
          addLog('error', 'Error starting server', error);
          return;
        }
      } else {
        const error = await window.electronAPI.fileServer.stop();
        if (error) {
          addLog('error', 'Error stopping server', error);
          return;
        }

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
      addLog('error', 'Error toggling server', error);
    }
  };

  const handleTemplateChange = (e: SelectChangeEvent) => {
    setProjectState(prev => ({
      ...prev,
      selectedTemplate: e.target.value,
    }));
  };

  const handleCreateProject = async () => {
    try {
      if (!projectState.selectedDirectory) {
        throw new Error('No directory selected');
      }

      if (!projectState.selectedTemplate) {
        throw new Error('No template selected');
      }

      setProjectState(prev => ({
        ...prev,
        isCreatingProject: true,
      }));

      const result = await window.electronAPI.tools.createProject(
        projectState.selectedDirectory,
        projectState.selectedTemplate
      );

      if (result.success) {
        addLog('success', result.message);
        await window.electronAPI.os.openPath(projectState.selectedDirectory);
        // Read directory contents after creating project
        await readSelectedDirectory(projectState.selectedDirectory);
      } else {
        addLog('error', result.message, result.error);
      }

      setProjectState(prev => ({
        ...prev,
        isCreatingProject: false,
        notification: {
          open: true,
          message: result.success
            ? `Project successfully created in ${projectState.selectedDirectory}`
            : `Failed to create project: ${result.error ?? 'Unknown error'}`,
          severity: result.success ? 'success' : 'error'
        }
      }));
    } catch (error) {
      addLog('error', 'Error creating project', error);
      setProjectState(prev => ({
        ...prev,
        isCreatingProject: false,
        notification: {
          open: true,
          message: 'Failed to create project due to an unexpected error',
          severity: 'error'
        }
      }));
    }
  };

  const handleCloseNotification = () => {
    setProjectState(prev => ({
      ...prev,
      notification: {
        ...prev.notification,
        open: false
      }
    }));
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const handleRefreshProject = async () => {
    if (projectState.selectedDirectory) {
      await readSelectedDirectory(projectState.selectedDirectory);
    }
  };

  const handleOpenDirectory = async () => {
    if (projectState.selectedDirectory) {
      try {
        await window.electronAPI.os.openPath(projectState.selectedDirectory);
      } catch (error) {
        addLog('error', 'Failed to open directory', error);
      }
    }
  };

  const handleClearLogs = () => {
    setProjectState(prev => ({
      ...prev,
      logs: [],
    }));
  };

  const handleOpenAppLog = async () => {
    try {
      if (!projectState.appInfo?.logPath) {
        addLog('error', 'App log path not available');
        return;
      }

      await window.electronAPI.os.openPath(projectState.appInfo.logPath);
      addLog('info', `Opened app log: ${projectState.appInfo.logPath}`);
    } catch (error) {
      addLog('error', 'Failed to open app log', error);
    }
  };

  const handleBuildProject = async () => {
    try {
      if (!projectState.selectedDirectory) {
        throw new Error('No directory selected');
      }

      setProjectState(prev => ({
        ...prev,
        isBuildingProject: true,
      }));

      addLog('info', `Building project in ${projectState.selectedDirectory}...`);

      const result = await window.electronAPI.tools.buildProject(
        projectState.selectedDirectory
      );

      if (result.success) {
        addLog('success', result.message);
      } else {
        addLog('error', result.message, result.error);
      }

      setProjectState(prev => ({
        ...prev,
        isBuildingProject: false,
        notification: {
          open: true,
          message: result.success
            ? 'Project built successfully'
            : `Failed to build project: ${result.error ?? 'Unknown error'}`,
          severity: result.success ? 'success' : 'error'
        }
      }));
    } catch (error) {
      addLog('error', 'Error building project', error);
      setProjectState(prev => ({
        ...prev,
        isBuildingProject: false,
        notification: {
          open: true,
          message: 'Failed to build project due to an unexpected error',
          severity: 'error'
        }
      }));
    }
  };

  const handleDeleteProject = async () => {
    try {
      if (!projectState.selectedDirectory) {
        throw new Error('No directory selected');
      }

      setProjectState(prev => ({
        ...prev,
        isDeletingProject: true,
      }));

      addLog('info', `Deleting project in ${projectState.selectedDirectory}...`);

      const result = await window.electronAPI.tools.deleteProject(
        projectState.selectedDirectory
      );

      if (result.success) {
        addLog('success', result.message);

        await readSelectedDirectory(projectState.selectedDirectory);

        // Update state
        setProjectState(prev => ({
          ...prev,
          isDeletingProject: false,
          notification: {
            open: true,
            message: 'Project deleted successfully',
            severity: 'success'
          }
        }));
      } else {
        addLog('error', result.message, result.error);

        setProjectState(prev => ({
          ...prev,
          isDeletingProject: false,
          notification: {
            open: true,
            message: `Failed to delete project: ${result.error ?? 'Unknown error'}`,
            severity: 'error'
          }
        }));
      }
    } catch (error) {
      addLog('error', 'Error deleting project', error);
      setProjectState(prev => ({
        ...prev,
        isDeletingProject: false,
        notification: {
          open: true,
          message: 'Failed to delete project due to an unexpected error',
          severity: 'error'
        }
      }));
    }
  };

  const handleOpenDeleteConfirm = () => {
    setProjectState(prev => ({
      ...prev,
      deleteConfirmOpen: true
    }));
  };

  const handleCloseDeleteConfirm = () => {
    setProjectState(prev => ({
      ...prev,
      deleteConfirmOpen: false
    }));
  };

  return (
    <div className="project-management">
      {projectState.selectedDirectory ? (
        <div className="current-directory">
          <div className="directory-content">
            <strong>Current Project:</strong> {projectState.selectedDirectory}
          </div>
          <LoadingButton
            size="medium"
            variant="contained"
            color="success"
            onClick={handleOpenDirectory}
            style={{ marginLeft: '10px' }}
            sx={{ textTransform: 'none' }}
          >
            Open in Explorer
          </LoadingButton>
          <LoadingButton
            size="medium"
            variant="contained"
            color="primary"
            onClick={handleChooseDirectory}
            style={{ marginLeft: '10px' }}
            sx={{ textTransform: 'none' }}
          >
            Switch Project
          </LoadingButton>
          <LoadingButton
            size="medium"
            variant="contained"
            color="primary"
            onClick={handleRefreshProject}
            style={{ marginLeft: '10px' }}
            sx={{ textTransform: 'none' }}
          >
            Refresh
          </LoadingButton>
        </div>
      ) : (
        <div className="directory-warning">
          <strong>Warning:</strong> No project selected.
          <LoadingButton
            size="medium"
            variant="contained"
            color="primary"
            onClick={handleChooseDirectory}
            style={{ marginLeft: '15px' }}
            sx={{ textTransform: 'none' }}
          >
            Select Project
          </LoadingButton>
        </div>
      )}

      <div className="project-layout">
        <div
          className="project-controls"
          style={{ width: `${projectState.leftPanelWidth}px` }}
        >
          <div className="controls">
            {projectState.selectedDirectory && projectState.directoryContents !== null && (
              <>
                {projectState.directoryContents.length === 0 ? (
                  // Directory is empty, show create project UI
                  <div className="control-group">
                    <div className="template-selection">
                      <FormControl fullWidth>
                        <InputLabel id="template-select-label">Template</InputLabel>
                        <Select
                          labelId="template-select-label"
                          id="template-select"
                          value={projectState.selectedTemplate ?? ''}
                          label="Template"
                          onChange={handleTemplateChange}
                          disabled={projectState.isCreatingProject}
                        >
                          {projectState.templates.map(template => (
                            <MenuItem key={template.id} value={template.id}>
                              {template.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>
                    <LoadingButton
                      variant="contained"
                      onClick={handleCreateProject}
                      disabled={!projectState.selectedDirectory || !projectState.selectedTemplate || projectState.isCreatingProject}
                      loading={projectState.isCreatingProject}
                    >
                      Create New Project
                    </LoadingButton>
                  </div>
                ) : (
                  // Directory is not empty, show build/server UI
                  <>
                    <div className="control-group">
                      <LoadingButton
                        variant="contained"
                        onClick={handleToggleServer}
                        color={projectState.serverStatus.isRunning ? 'error' : 'primary'}
                        disabled={!projectState.selectedDirectory}
                      >
                        {projectState.serverStatus.isRunning
                          ? `Stop File Server (Port: ${projectState.serverStatus.port})`
                          : 'Start File Server'}
                      </LoadingButton>
                    </div>

                    <div className="control-group">
                      <LoadingButton
                        variant="contained"
                        onClick={handleBuildProject}
                        color="info"
                        disabled={!projectState.selectedDirectory || projectState.isBuildingProject}
                        loading={projectState.isBuildingProject}
                      >
                        Build Project
                      </LoadingButton>
                    </div>

                    {/* Add delete project button at the bottom - only for non-empty projects */}
                    <div className="control-group" style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
                      <LoadingButton
                        variant="contained"
                        onClick={handleOpenDeleteConfirm}
                        color="error"
                        disabled={!projectState.selectedDirectory || projectState.isDeletingProject}
                        loading={projectState.isDeletingProject}
                        fullWidth
                        sx={{ textTransform: 'none' }}
                      >
                        Delete Project
                      </LoadingButton>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div
          className="resize-divider"
          ref={resizeDividerRef}
          onMouseDown={handleResizeStart}
          title="Drag to resize"
        ></div>

        <div className="project-logs">
          <div className="logs-header">
            <h3>Logs</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <LoadingButton
                size="small"
                variant="outlined"
                color="primary"
                onClick={handleOpenAppLog}
                disabled={!projectState.appInfo?.logPath}
              >
                Open App Log
              </LoadingButton>
              <LoadingButton
                size="small"
                variant="outlined"
                color="secondary"
                onClick={handleClearLogs}
              >
                Clear Logs
              </LoadingButton>
            </div>
          </div>
          {projectState.logs.map((log, index) => (
            <div key={index} className={`log-entry log-entry-${log.level}`}>
              <span className="log-timestamp">[{formatTimestamp(log.timestamp)}]</span>
              {log.message}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>

      <Snackbar
        open={projectState.notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={projectState.notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {projectState.notification.message}
        </Alert>
      </Snackbar>

      {/* Delete confirmation dialog */}
      <Dialog
        open={projectState.deleteConfirmOpen}
        onClose={handleCloseDeleteConfirm}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Confirm Project Deletion
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete the project at:
            <br />
            <strong>{projectState.selectedDirectory}</strong>
            <br /><br />
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm} color="primary">
            Cancel
          </Button>
          <Button
            onClick={() => {
              handleCloseDeleteConfirm();
              handleDeleteProject();
            }}
            color="error"
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
