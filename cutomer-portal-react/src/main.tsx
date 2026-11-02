import { StrictMode ,Suspense } from "react";
import { createRoot } from "react-dom/client";

import ReduxProvider from "./app/providers/ReduxProvider";
import ThemeProvider from "./app/providers/ThemeProvider";
import AppRouterProvider from "./app/router/RouterProvider";

import "./i18n";
import "./index.css";

function LoadingFallback() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[#F5F7FB] text-sm text-slate-600"
      role="status"
      aria-live="polite"
    >
      Loading...
    </div>
  );
}
createRoot(
  document.getElementById("root")!
).render(
  <StrictMode>
    <ReduxProvider>
      <ThemeProvider />
        <Suspense fallback={<LoadingFallback />}>
        <AppRouterProvider />
      </Suspense>
    </ReduxProvider>
  </StrictMode>
);