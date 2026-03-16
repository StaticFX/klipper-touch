import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { showMockSummary, showMockSummaryState } from "./components/print/PrintPage";

// Dev helpers — call from browser console
if (import.meta.env.DEV) {
  Object.assign(window, { showMockSummary, showMockSummaryState });
}

// Block all zoom gestures
document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("gesturechange", (e) => e.preventDefault());
document.addEventListener("gestureend", (e) => e.preventDefault());
document.addEventListener("touchmove", (e) => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
