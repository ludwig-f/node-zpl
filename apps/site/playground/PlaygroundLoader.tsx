"use client";

import dynamic from "next/dynamic";
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
