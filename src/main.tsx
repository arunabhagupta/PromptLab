import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './app/tokens.css';
import './pipeline/pipeline.css';
import './app/app.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
);
