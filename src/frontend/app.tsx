import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

import { ProjectManagement } from './components/ProjectManagement.js';
import './components/ProjectManagement.css';
import './styles.css';

// Create a theme instance
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#4a90e2',
    },
    error: {
      main: '#e25c5c',
    },
  },
});

const App = () => {
  const [engineVersion, setEngineVersion] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    const fetchVersions = async () => {
      const [engineVersion, appVersion] = await Promise.all([
        window.electronAPI.tools.getEngineVersion(),
        window.electronAPI.tools.getAppVersion(),
      ]);
      setEngineVersion(engineVersion);
      setAppVersion(appVersion);
    };
    fetchVersions();
  }, []);

  const handleOpenEditor = (e: React.MouseEvent) => {
    e.preventDefault();
    window.electronAPI.os.openPath('https://web--genesys-ai.us-central1.hosted.app/');
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="app">
        <h2>Genesys <a
          href="#"
          onClick={handleOpenEditor}
          style={{
            fontSize: '1.0em',
            marginLeft: '8px',
            textDecoration: 'none',
            color: theme.palette.primary.main,
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Open Editor
        </a></h2>
        <p><strong> App: {appVersion} Engine: {engineVersion}</strong></p>
        <ProjectManagement />
      </div>
    </ThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);

