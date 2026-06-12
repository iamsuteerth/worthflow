import React from "react";

import ReactDOM
  from "react-dom/client";

import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";

import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

import "./index.css";

import App
  from "./app/App";

import { AppProvider } from "./app/AppProvider";

ReactDOM.createRoot(
  document.getElementById(
    "root"
  )!
).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
);