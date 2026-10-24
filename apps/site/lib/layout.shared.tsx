import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { appName, gitConfig } from "./shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex size-6 items-center justify-center rounded-[5px] border-2 border-current pt-1 font-mono text-[15px] font-bold leading-none"
          >
            ^
          </span>
          <span className="text-[19px] font-extrabold tracking-[-0.01em] [font-stretch:115%]">
            {appName}
          </span>
        </span>
      ),
    },
    links: [
      { text: "Docs", url: "/docs", active: "nested-url" },
      { text: "Playground", url: "/playground" },
      { text: "Viewer", url: "/viewer" },
      { text: "Reference", url: "/reference" },
      { text: "Releases", url: "/releases" },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
