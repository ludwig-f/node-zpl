"use client";

import { useEffect } from "react";

/**
 * Labels in links to the playground are now opened in the viewer. They're in
 * the URL's hash, which never reaches the server, so this redirects in the
 * browser and keeps the hash.
 */
export default function ToViewer() {
  useEffect(() => {
    location.replace(`/viewer${location.hash}`);
  }, []);
  return (
    <p className="p-6 text-fd-muted-foreground">
      The playground for ZPL is now the <a href="/viewer">ZPL viewer</a>.
    </p>
  );
}
