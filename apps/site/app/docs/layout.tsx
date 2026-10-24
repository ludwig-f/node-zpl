import { source } from "@/lib/source";
import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import { baseOptions } from "@/lib/layout.shared";

/** Docs keep the site's header across the top, with their sidebar below */
export default function Layout({ children }: LayoutProps<"/docs">) {
  const options = baseOptions();
  return (
    <DocsLayout
      tree={source.getPageTree()}
      {...options}
      nav={{ ...options.nav, mode: "top" }}
    >
      {children}
    </DocsLayout>
  );
}
