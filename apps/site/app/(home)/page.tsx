import Link from "next/link";
import { ServerCodeBlock } from "fumadocs-ui/components/codeblock.rsc";
import Bench from "@/playground/Bench";
import { renderLabel } from "@/lib/render-label";
import { exampleLabel, exampleSource } from "@/components/home/example-label";

const lintExample = `lint(parse(zpl).commands);
// The box is 1 dot wide but its
// line is 2 dots thick, so the
// printer widens it to 2 dots.`;

const previewExample = `<zpl-preview\n  zpl={label}\n  dpmm={8}\n/>`;

const features = [
  {
    title: "Build labels with types",
    text: "Write labels as JSX or method calls. Every length takes a unit, mm() or dots(), so a bare number is a type error, and text is escaped for you.",
    href: "/docs/building-labels",
    code: {
      source: `<Text x={mm(5)} y={mm(5)}>\n  Hello\n</Text>`,
      lang: "tsx",
    },
  },
  {
    title: "Catch what the printer won't tell you",
    text: "Printers quietly clamp values, ignore commands and skip fields. The linter finds those problems in labels you build and in ZPL you already have.",
    href: "/docs/linting",
    code: { source: lintExample, lang: "ts" },
  },
  {
    title: "Preview anywhere",
    text: "A web component renders labels in the browser for React, Vue, Svelte, Angular or plain HTML. Label data never leaves the page.",
    href: "/docs/preview",
    code: { source: previewExample, lang: "tsx" },
  },
];

export default async function HomePage() {
  const labelImage = await renderLabel(exampleLabel.toZPL(), {
    widthMm: 101.6,
    heightMm: 50.8,
    dpmm: 8,
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-12 md:px-6 md:pt-20">
      <section className="grid items-start gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="flex flex-col gap-6 lg:sticky lg:top-24">
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight [font-stretch:85%] text-balance md:text-6xl">
            Zebra labels, written in TypeScript
          </h1>
          <p className="max-w-[48ch] text-lg text-fd-muted-foreground">
            zplkit builds ZPL from typed code or JSX, checks it for mistakes the
            printer won't report, and shows you the label before anything is
            printed.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/docs"
              className="rounded-md bg-fd-primary px-4 py-2.5 font-semibold text-fd-primary-foreground transition-opacity hover:opacity-90"
            >
              Read the docs
            </Link>
            <Link
              href="/playground"
              className="rounded-md border border-fd-border bg-fd-card px-4 py-2.5 font-semibold transition-colors hover:bg-fd-muted"
            >
              Open the playground
            </Link>
          </div>
          <code className="w-fit rounded-md border border-fd-border bg-fd-card px-3 py-2 font-mono text-sm">
            npm install @zplkit/core
          </code>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <div className="min-w-0 [&_figure]:my-0">
            <ServerCodeBlock code={exampleSource} lang="tsx" />
          </div>
          <Bench widthMm={101.6} heightMm={50.8}>
            <img
              className="label-image"
              src={labelImage}
              width={813}
              height={407}
              alt="A 4 by 2 inch shipping label: Harbor Parts Co., order 10442 on shelf B_3, an EXPRESS marker, a Code 128 barcode and a Data Matrix code"
            />
          </Bench>
        </div>
      </section>

      <section className="mt-24 grid gap-10 md:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title} className="flex min-w-0 flex-col gap-3">
            <h2 className="text-xl font-bold tracking-tight [font-stretch:90%]">
              <Link href={feature.href} className="hover:underline">
                {feature.title}
              </Link>
            </h2>
            <p className="text-fd-muted-foreground">{feature.text}</p>
            <div className="min-w-0 [&_figure]:my-0">
              <ServerCodeBlock
                code={feature.code.source}
                lang={feature.code.lang}
              />
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
