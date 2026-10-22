"use client";

import dynamic from "next/dynamic";
import { configure } from "@node-zpl/preview";

// The renderer's WebAssembly is copied to public/ by scripts/copy-wasm.mjs
if (typeof window !== "undefined") {
  configure({ wasmUrl: "/zebrash.wasm" });
}

/** The playground needs the DOM (CodeMirror, <zpl-preview>), so it renders in the browser only */
const Playground = dynamic(() => import("./Playground"), {
  ssr: false,
  loading: () => (
    <p className="p-6 text-fd-muted-foreground">Loading the playground…</p>
  ),
});

export default function PlaygroundLoader() {
  return <Playground />;
}
