import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl, API_BASE_URL } from "@workspace/api-client-react";

// Configure API base URL for cross-origin deployments (e.g., Vercel frontend → separate API server)
if (API_BASE_URL) {
  setBaseUrl(API_BASE_URL);
}

createRoot(document.getElementById("root")!).render(<App />);
