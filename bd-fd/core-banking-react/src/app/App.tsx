import ReduxProvider from './providers/ReduxProvider';
import RouterProvider from './router/RouterProvider';

export default function App() {
  return (
    <ReduxProvider>
      <RouterProvider />
    </ReduxProvider>
  );
}
