import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import { Archivo, Spline_Sans_Mono } from "next/font/google";
import { siteUrl } from "@/lib/shared";
import "./global.css";

const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  variable: "--font-archivo",
});

const splineSansMono = Spline_Sans_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-spline-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "zplkit", template: "%s | zplkit" },
  description:
    "Build, parse, lint and preview ZPL for Zebra label printers in TypeScript, with typed method calls or JSX.",
};

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${splineSansMono.variable}`}
      suppressHydrationWarning
    >
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
