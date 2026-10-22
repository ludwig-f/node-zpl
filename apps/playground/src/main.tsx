import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource/spline-sans-mono/400.css";
import "@fontsource/spline-sans-mono/600.css";
import "./styles.css";
import { configure } from "@node-zpl/preview";
import wasmUrl from "zpl-renderer-js/wasm?url";
import App from "./App.js";

// Serve the renderer's WebAssembly as its own file instead of inlined in a
// script, so browsers can compile it while it downloads
configure({ wasmUrl });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
