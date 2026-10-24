import type { Metadata } from "next";
import Link from "next/link";
import data from "@/content/commands.json";
import { CommandsTable } from "@/components/reference/commands-table";
import { categoryAnchor } from "@/components/reference/anchor";

export const metadata: Metadata = {
  title: "Supported commands",
  description: "Which ZPL commands zplkit reads, writes and draws.",
};

const supported = data.commands.filter((command) => command.parsed).length;

export default function ReferencePage() {
  return (
    <div className="@container w-full [--fd-header-height:3.5rem]">
      <div className="mx-auto grid max-w-[1280px] gap-x-10 px-[clamp(16px,4cqi,48px)] @[1000px]:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden @[1000px]:block">
          <nav className="sticky top-20 flex flex-col gap-0.5 pt-11 text-[14.5px]">
            <span className="px-2.5 pb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              Categories
            </span>
            {data.categories.map((category) => (
              <a
                key={category}
                href={`#${categoryAnchor(category)}`}
                className="flex justify-between rounded px-2.5 py-1 text-ink-2 hover:bg-surface hover:text-ink"
              >
                <span>{category}</span>
                <span className="font-mono text-xs text-muted">
                  {data.commands.filter((c) => c.category === category).length}
                </span>
              </a>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 max-w-[920px] pb-16 pt-[clamp(24px,4cqi,44px)]">
          <div className="flex flex-col gap-3.5">
            <h1 className="text-[clamp(32px,4cqi,44px)] font-extrabold leading-[1.05] tracking-[-0.02em] [font-stretch:112%]">
              Supported commands
            </h1>
            <p className="max-w-[40em] text-pretty text-muted">
              zplkit reads and writes {supported} of the {data.commands.length}{" "}
              commands in Zebra&apos;s ZPL II Programming Guide.{" "}
              <strong className="text-ink">Read and write</strong> means{" "}
              <code className="font-mono text-[0.9em]">parse()</code> turns the
              command into a typed node and labels can be built with it; other
              commands are kept as raw text and can be added with{" "}
              <code className="font-mono text-[0.9em]">raw()</code>.{" "}
              <strong className="text-ink">Drawn</strong> means the{" "}
              <Link
                href="/docs/rendering"
                className="text-accent hover:underline"
              >
                renderer
              </Link>{" "}
              and the{" "}
              <Link
                href="/docs/preview"
                className="text-accent hover:underline"
              >
                preview
              </Link>{" "}
              show what it does. Printer settings, like print speed, don&apos;t
              change the label&apos;s image.
            </p>
          </div>
          <CommandsTable />
        </main>
      </div>
    </div>
  );
}
