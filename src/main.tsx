
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
import { prefetchForLocation } from "./shared/api/prefetch";

  // Before React: the first page's public data then downloads alongside its
// code instead of after it. See shared/api/prefetch.ts.
prefetchForLocation(window.location);

createRoot(document.getElementById("root")!).render(<App />);
  