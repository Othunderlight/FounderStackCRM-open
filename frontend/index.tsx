import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { PostHogProvider } from "posthog-js/react";
import "./src/index.css";
import App from "./App";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const POSTHOG_ENABLED = import.meta.env.VITE_POSTHOG_ENABLED !== "false";
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST =
  import.meta.env.VITE_POSTHOG_HOST || "https://eu.i.posthog.com";

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {POSTHOG_ENABLED && POSTHOG_KEY ? (
      <PostHogProvider
        apiKey={POSTHOG_KEY}
        options={{
          api_host: POSTHOG_HOST,
          capture_exceptions: true,
          person_profiles: "identified_only",
          debug: import.meta.env.MODE === "development",
        }}
      >
        <HashRouter>
          <App />
        </HashRouter>
      </PostHogProvider>
    ) : (
      <HashRouter>
        <App />
      </HashRouter>
    )}
  </React.StrictMode>,
);
