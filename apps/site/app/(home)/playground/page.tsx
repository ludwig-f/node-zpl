import type { Metadata } from "next";
import ToViewer from "./to-viewer";

// Only forwards old links for now. When the code playground replaces this
// page, remove robots and alternates and add /playground back to the sitemap
export const metadata: Metadata = {
  title: "ZPL viewer",
  robots: { index: false },
  alternates: { canonical: "/viewer" },
};

export default function PlaygroundPage() {
  return <ToViewer />;
}
