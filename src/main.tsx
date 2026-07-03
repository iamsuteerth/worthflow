import React from "react";
import ReactDOM from "react-dom/client";
import { bootstrapAmplify } from "@/lib/amplify";

import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";
import "@mantine/notifications/styles.css";

import "@/index.css";

import App from "@/app/App";
import { AppProvider } from "@/app/AppProvider";
import { ErrorBoundary } from "@/components/ui";

bootstrapAmplify();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </AppProvider>
  </React.StrictMode>
);
