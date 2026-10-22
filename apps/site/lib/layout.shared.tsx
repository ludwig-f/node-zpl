import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { appName, gitConfig } from "./shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <span className="font-bold tracking-tight">{appName}</span>,
    },
    links: [
      { text: "Docs", url: "/docs", active: "nested-url" },
      { text: "Playground", url: "/playground" },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
