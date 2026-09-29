import {
  createBrowserRouter,
  RouterProvider as ReactRouterProvider,
} from "react-router-dom";
// ၁။ မိမိ Component ကို Import လုပ်ပါ
import { TransactionReport } from "../../features/auth/reports/TransactionReport";

const router = createBrowserRouter([
  // ... အခြားရှိပြီးသား Route များ (ဥပမာ Login, Dashboard စသည်) ...

  // ၂။ ယခု Report အတွက် Route အသစ် ထည့်ပါ
  {
    path: "/reports/transactions",
    element: <TransactionReport />,
  },
]);

export function RouterProvider() {
  return <ReactRouterProvider router={router} />;
}
