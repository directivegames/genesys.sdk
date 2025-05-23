import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

import { ProjectManagement } from './components/ProjectManagement.js';

import './components/ProjectManagement.css';
import './styles.css';
import type { AppInfo } from '../api.js';

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
  const [info, setInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    const fetchVersions = async () => {
      const info = await window.electronAPI.app.getInfo();
      setInfo(info);
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
        <p><strong>App: {info?.appVersion}, Engine: {info?.engineVersion}{info?.isDev ? ', Development Build' : ''}</strong></p>
        <ProjectManagement />
      </div>
    </ThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);

