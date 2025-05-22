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
  error: string | null;
  templates: ProjectTemplate[];
  selectedTemplate: string | null;
  isCreatingProject: boolean;
  notification: {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  };
  logs: LogEntry[];
};

// Constants for localStorage
const STORAGE_KEY_DIRECTORY = 'genesys_last_directory';

export const ProjectManagement = () => {
  const [projectState, setProjectState] = useState<ProjectState>({
    selectedDirectory: localStorage.getItem(STORAGE_KEY_DIRECTORY),
    serverStatus: {
      isRunning: false,
      port: 4000,
    },
    error: null,
    templates: [],
    selectedTemplate: null,
    isCreatingProject: false,
    notification: {
      open: false,
      message: '',
      severity: 'info'
    },
    logs: []
  });

  const logEndRef = useRef<HTMLDivElement>(null);

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

  // Scroll to bottom when logs update
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [projectState.logs]);

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

  const handleOpenDirectory = async () => {
    try {
      const directory = await window.electronAPI.os.openDirectory();
      if (directory) {
        // Save to localStorage
        localStorage.setItem(STORAGE_KEY_DIRECTORY, directory);

        setProjectState(prev => ({
          ...prev,
          selectedDirectory: directory,
          error: null,
        }));

        addLog('success', `Selected and saved directory: ${directory}`);
      } else {
        // User canceled directory selection
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

  const handleTemplateChange = (e: SelectChangeEvent) => {
    setProjectState(prev => ({
      ...prev,
      selectedTemplate: e.target.value,
    }));

    const selectedTemplateName = projectState.templates.find(t => t.id === e.target.value)?.name;
  };

  const handleCreateProject = async () => {
    try {
      if (!projectState.selectedDirectory) {
        setProjectState(prev => ({
          ...prev,
          error: 'Please select a directory first',
        }));
        return;
      }

      if (!projectState.selectedTemplate) {
        setProjectState(prev => ({
          ...prev,
          error: 'Please select a template',
        }));
        return;
      }

      const templateName = projectState.templates.find(t => t.id === projectState.selectedTemplate)?.name;

      setProjectState(prev => ({
        ...prev,
        isCreatingProject: true,
        error: null,
      }));

      const result = await window.electronAPI.tools.createProject(
        projectState.selectedDirectory,
        projectState.selectedTemplate
      );

      setProjectState(prev => ({
        ...prev,
        isCreatingProject: false,
        error: result.success ? null : result.error ?? 'Failed to create project',
        notification: {
          open: true,
          message: result.success
            ? `Project successfully created in ${projectState.selectedDirectory}`
            : `Failed to create project: ${result.error ?? 'Unknown error'}`,
          severity: result.success ? 'success' : 'error'
        }
      }));
    } catch (error) {
      console.error('Error creating project:', error);
      setProjectState(prev => ({
        ...prev,
        isCreatingProject: false,
        error: 'Failed to create project',
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

      {projectState.error && (
        <div className="error-message">
          {projectState.error}
        </div>
      )}

      <div className="project-layout">
        <div className="project-controls">
          <div className="controls">
            <div className="control-group">
              <LoadingButton
                variant="contained"
                onClick={handleOpenDirectory}
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
                  ? `Stop Server (Port: ${projectState.serverStatus.port})`
                  : 'Start Server'}
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