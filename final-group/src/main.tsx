import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { createLocalDemoTripBackend, shouldUseLocalDemoPreview } from "./demo/localDemo";
import { createFirebaseTripBackend } from "./firebase";
import "./styles.css";

const root = createRoot(document.getElementById("root")!);
const demoMode = shouldUseLocalDemoPreview(window.location.search, import.meta.env.DEV);

try {
  const backend = demoMode ? createLocalDemoTripBackend() : createFirebaseTripBackend();
  root.render(<StrictMode><App backend={backend} demoMode={demoMode} /></StrictMode>);
} catch (error) {
  root.render(
    <main className="screen-message" role="alert">
      <h1>TripFlow chưa được cấu hình</h1>
      <p>{error instanceof Error ? error.message : "Không thể khởi tạo Firebase."}</p>
    </main>,
  );
}
