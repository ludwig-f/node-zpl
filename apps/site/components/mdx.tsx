import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { CommandsTable } from "@/components/reference/commands-table";
import { Callout } from "@/components/docs/callout";

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    CommandsTable,
    Callout,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
