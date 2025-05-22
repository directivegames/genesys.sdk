import { useEffect, useState } from 'react';

import type { ProjectTemplate } from '../../api.js';

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

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
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
      }));

      if (result.success) {
        // Maybe refresh or update UI after successful creation
      }
    } catch (error) {
      console.error('Error creating project:', error);
      setProjectState(prev => ({
        ...prev,
        isCreatingProject: false,
        error: 'Failed to create project',
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

        <div className="control-group">
          <div className="template-selection">
            <select
              value={projectState.selectedTemplate ?? ''}
              onChange={handleTemplateChange}
              disabled={projectState.isCreatingProject}
            >
              {projectState.templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCreateProject}
            disabled={!projectState.selectedDirectory || !projectState.selectedTemplate || projectState.isCreatingProject}
          >
            {projectState.isCreatingProject ? 'Creating...' : 'Create New Project'}
          </button>
        </div>
      </div>
    </div>
  );
};