import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

// Ensure the latest frontend bundle is used (prevents stale cached UI in installed PWAs)
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true);
  },
});

createRoot(document.getElementById("root")!).render(<App />);
