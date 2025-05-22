import ReactDOM from 'react-dom/client';

const App = () => <h1>3333</h1>;

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);

declare global {
    interface Window {
        electronAPI: {
        ping: () => Promise<string>;
        };
    }
}

window.electronAPI.ping().then(console.log); // prints: "pong from main process"
