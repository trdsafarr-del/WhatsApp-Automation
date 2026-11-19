import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { installDashboardFetchInterceptor } from './lib/dashboardAuth.ts';
import './index.css';

installDashboardFetchInterceptor();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
