import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const style = document.createElement('style');
style.textContent = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { 
    font-family: 'Avenir Next', 'SF Pro Rounded', 'PingFang SC', sans-serif;
    background: transparent;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
  }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
