import ReduxProvider from './providers/ReduxProvider';
import RouterProvider from './router/RouterProvider';
import { ToastProvider } from '../context/ToastContext';

export default function App() {
  return (
    <ReduxProvider>
      <ToastProvider>
        <RouterProvider />
      </ToastProvider>
    </ReduxProvider>
  );
}
