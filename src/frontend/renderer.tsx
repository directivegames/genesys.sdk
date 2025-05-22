import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, ThemeProvider } from '@mui/material/styles';
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
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="app">
        <h1>Genesys</h1>
        <ProjectManagement />
      </div>
    </ThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);

