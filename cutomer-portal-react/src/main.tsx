import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import ReduxProvider from "./app/providers/ReduxProvider";
import AppRouterProvider from "./app/router/RouterProvider";

import "./index.css";

createRoot(
  document.getElementById("root")!
).render(
  <StrictMode>
    <ReduxProvider>
      <AppRouterProvider />
    </ReduxProvider>
  </StrictMode>
);