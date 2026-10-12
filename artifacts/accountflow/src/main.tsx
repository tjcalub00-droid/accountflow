import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './styles/tailwind.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'sonner';

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <AuthProvider>
      <App />
      <Toaster position="bottom-right" richColors />
    </AuthProvider>
  </ErrorBoundary>,
);
