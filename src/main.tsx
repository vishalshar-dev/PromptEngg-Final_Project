import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { FirebaseErrorBoundary } from './components/cloud/FirebaseErrorBoundary';
import { CloudSyncProvider } from './contexts/CloudSyncContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FirebaseErrorBoundary>
      <CloudSyncProvider>
        <App />
      </CloudSyncProvider>
    </FirebaseErrorBoundary>
  </React.StrictMode>
);