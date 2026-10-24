"use client";

import dynamic from "next/dynamic";
/** The viewer needs the DOM (CodeMirror, <zpl-preview>), so it renders in the browser only */
const Viewer = dynamic(() => import("./Viewer"), {
  ssr: false,
  loading: () => (
    <p className="p-6 text-fd-muted-foreground">Loading the viewer…</p>
  ),
});

export default function ViewerLoader() {
  return <Viewer />;
}
