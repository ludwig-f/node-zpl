import { llms, loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { docsRoute } from "./shared";
import { defineDocs } from "fumadocs-mdx/macro";
import { applyMdxPreset } from "fumadocs-mdx/config";
import { codeTheme } from "./code-theme";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import {
  createFileSystemGeneratorCache,
  createGenerator,
  remarkAutoTypeTable,
} from "fumadocs-typescript";
import type { RemarkAutoTypeTableOptions } from "fumadocs-typescript";

type TypeSimplifierContext = Parameters<
  NonNullable<
    NonNullable<
      NonNullable<RemarkAutoTypeTableOptions["options"]>["typeSimplifier"]
    >["override"]
  >
>[0];

/**
 * Show short types in full, like `6 | 8 | 12 | 24`, instead of "union".
 * Optional props leave out undefined, since the table marks them optional,
 * and named types like Length keep their name.
 */
const shortUnion = ({ type, checker, location }: TypeSimplifierContext) => {
  if ((type as { getAliasSymbol?: () => unknown }).getAliasSymbol?.()) {
    return undefined;
  }
  const text = checker
    .typeToString(type, location)
    .split(" | ")
    .filter((member) => member !== "undefined")
    .join(" | ");
  return text.length <= 48 && !/[{&(]/.test(text) ? text : undefined;
};

// API reference tables, generated from the packages' TypeScript types
const generator = createGenerator({
  cache: createFileSystemGeneratorCache(".next/fumadocs-typescript"),
});

const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: pageSchema,
    // Fumadocs' defaults, with code in the site's syntax colors. The theme
    // uses CSS variables, so one theme covers light and dark.
    mdxOptions: applyMdxPreset({
      rehypeCodeOptions: { themes: { light: codeTheme, dark: codeTheme } },
      remarkPlugins: (plugins) => [
        ...plugins,
        [
          remarkAutoTypeTable,
          {
            generator,
            remarkStringify: true,
            options: { typeSimplifier: { override: shortUnion } },
          },
        ],
      ],
    }),
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
});

export const docsLlms = llms(source, {
  renderPage: async (page) => `# ${page.data.title} (${page.url})

${await page.data.getText("processed")}`,
});
