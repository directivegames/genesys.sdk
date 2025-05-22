import { LoadingButton } from '@mui/lab';
import { Alert, FormControl, InputLabel, MenuItem, Select, Snackbar } from '@mui/material';
import { useEffect, useState } from 'react';

import type { ProjectTemplate } from '../../api.js';
import type { SelectChangeEvent} from '@mui/material';

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
};

export const ProjectManagement = () => {
  const [projectState, setProjectState] = useState<ProjectState>({
    selectedDirectory: null,
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
    }
  });

  // Check server status on component mount and fetch templates
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

    const fetchTemplates = async () => {
      try {
        const templates = await window.electronAPI.tools.getProjectTemplates();
        setProjectState(prev => ({
          ...prev,
          templates,
          selectedTemplate: templates.length > 0 ? templates[0].id : null,
        }));
      } catch (error) {
        console.error('Error fetching project templates:', error);
      }
    };

    checkServerStatus();
    fetchTemplates();

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

  const handleTemplateChange = (e: SelectChangeEvent) => {
    setProjectState(prev => ({
      ...prev,
      selectedTemplate: e.target.value,
    }));
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

  return (
    <div className="project-management">
      <h2>Project Manager</h2>

      {projectState.selectedDirectory ? (
        <div className="current-directory">
          <strong>Current Directory:</strong> {projectState.selectedDirectory}
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