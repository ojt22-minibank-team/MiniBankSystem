import {
  createBrowserRouter,
  RouterProvider as ReactRouterProvider,
} from "react-router-dom";
import ReportingView from "../../features/reporting/ReportingView";

const router = createBrowserRouter([
  {
    path: "/reports",
    element: <ReportingView />,
  },
  {
    path: "/reports/transactions",
    element: <ReportingView />,
  },
]);

export function RouterProvider() {
  return <ReactRouterProvider router={router} />;
}
