import { LoadingButton } from '@mui/lab';
import { Alert, FormControl, InputLabel, MenuItem, Select, Snackbar } from '@mui/material';
import { useEffect, useRef, useState } from 'react';

import type { ProjectTemplate } from '../../api.js';
import type { SelectChangeEvent} from '@mui/material';

type LogLevel = 'info' | 'success' | 'error' | 'warning';

type LogEntry = {
  timestamp: Date;
  message: string;
  level: LogLevel;
};

type ProjectState = {
  selectedDirectory: string | null;
  serverStatus: {
    isRunning: boolean;
    port: number;
  };
  templates: ProjectTemplate[];
  selectedTemplate: string | null;
  isCreatingProject: boolean;
  notification: {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  };
  logs: LogEntry[];
  leftPanelWidth: number;
  isDragging: boolean;
};

// Constants for localStorage
const STORAGE_KEY_DIRECTORY = 'genesys_last_directory';
const STORAGE_KEY_PANEL_WIDTH = 'genesys_panel_width';
const DEFAULT_LEFT_PANEL_WIDTH = 300; // Default width in pixels

export const ProjectManagement = () => {
  const [projectState, setProjectState] = useState<ProjectState>({
    selectedDirectory: localStorage.getItem(STORAGE_KEY_DIRECTORY),
    serverStatus: {
      isRunning: false,
      port: 4000,
    },
    templates: [],
    selectedTemplate: null,
    isCreatingProject: false,
    notification: {
      open: false,
      message: '',
      severity: 'info'
    },
    logs: [],
    leftPanelWidth: parseInt(localStorage.getItem(STORAGE_KEY_PANEL_WIDTH) ?? DEFAULT_LEFT_PANEL_WIDTH.toString(), 10),
    isDragging: false
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

  const addLog = (level: LogLevel = 'info', ...args: any[]) => {
    const message = args.map(arg => {
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return '[Object]';
        }
      }
      return String(arg);
    }).join(' ');

    setProjectState(prev => ({
      ...prev,
      logs: [...prev.logs, {
        timestamp: new Date(),
        message,
        level
      }]
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
        console.error('Error fetching project templates:', error);
        addLog('error', 'Error fetching project templates');
      }
    };

    addLog('info', 'Initializing Genesys SDK');
    fetchTemplates();

    // If we have a saved directory, log it
    if (projectState.selectedDirectory) {
      addLog('info', `Loaded last used directory: ${projectState.selectedDirectory}`);
    }
  }, []);

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

      if (result.error) {
        addLog('error', 'Error creating project', result.error);
      } else {
        await window.electronAPI.os.openPath(projectState.selectedDirectory);
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

  const handleClearSavedDirectory = () => {
    localStorage.removeItem(STORAGE_KEY_DIRECTORY);
    setProjectState(prev => ({
      ...prev,
      selectedDirectory: null,
    }));
    addLog('info', 'Cleared saved directory');
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

  return (
    <div className="project-management">
      <h2>Project Manager</h2>

      {projectState.selectedDirectory ? (
        <div className="current-directory">
          <div className="directory-content">
            <strong>Current Directory:</strong> {projectState.selectedDirectory}
          </div>
          <LoadingButton
            size="small"
            variant="outlined"
            color="success"
            onClick={handleOpenDirectory}
            style={{ marginLeft: '10px' }}
          >
            Open
          </LoadingButton>
          <LoadingButton
            size="small"
            variant="outlined"
            color="primary"
            onClick={handleClearSavedDirectory}
            style={{ marginLeft: '10px' }}
          >
            Clear
          </LoadingButton>
        </div>
      ) : (
        <div className="directory-warning">
          <strong>Warning:</strong> No directory selected. Please select a directory to continue.
        </div>
      )}

      <div className="project-layout">
        <div
          className="project-controls"
          style={{ width: `${projectState.leftPanelWidth}px` }}
        >
          <div className="controls">
            <div className="control-group">
              <LoadingButton
                variant="contained"
                onClick={ handleChooseDirectory }
              >
                Open Directory
              </LoadingButton>
            </div>

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
          </div>
        </div>

        <div
          className="resize-divider"
          ref={resizeDividerRef}
          onMouseDown={handleResizeStart}
          title="Drag to resize"
        ></div>

        <div className="project-logs">
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
    </div>
  );
};
