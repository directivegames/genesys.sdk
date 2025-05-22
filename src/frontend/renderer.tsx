import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

import { ProjectManagement } from './components/ProjectManagement.js';
import './components/ProjectManagement.css';
import './styles.css';

const App = () => {
  const [pingResponse, setPingResponse] = useState<string | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await window.electronAPI.ping();
        setPingResponse(response);
      } catch (error) {
        console.error('Error connecting to Electron:', error);
      }
    };

    checkConnection();
  }, []);

  return (
    <div className="app">
      <h1>Genesys SDK</h1>
      {pingResponse && <div className="connection-status">Status: {pingResponse}</div>}
      <ProjectManagement />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);

window.electronAPI.ping().then(console.log);
