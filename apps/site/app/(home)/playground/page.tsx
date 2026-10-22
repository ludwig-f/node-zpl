import type { Metadata } from "next";
import PlaygroundLoader from "@/playground/PlaygroundLoader";

export const metadata: Metadata = {
  title: "Playground",
  description:
    "Write ZPL and see the label as you type, with warnings for mistakes the printer won't report. Everything runs in your browser.",
};

export default function PlaygroundPage() {
  return <PlaygroundLoader />;
}
