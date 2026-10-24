"use client";

import { useState } from "react";
import data from "@/content/commands.json";

type Command = (typeof data.commands)[number];
type Mode = "All" | "Drawn" | "Gaps";
type Drawn = "yes" | "no" | "partial" | "n/a";

/** The anchor for a command: #BC for ^BC, #tilde-CC for ~CC */
const anchorOf = (code: string) =>
  code.startsWith("~") ? `tilde-${code.slice(1)}` : code.slice(1);

const isGap = (command: Command) =>
  !command.parsed || command.drawn === "no" || command.drawn === "partial";

function Mark({ value }: { value: Drawn }) {
  if (value === "yes") {
    return (
      <span
        aria-label="Supported"
        className="inline-flex size-5 items-center justify-center rounded-[3px] bg-ok-soft text-[13px] font-extrabold text-ok"
      >
        ✓
      </span>
    );
  }
  if (value === "partial") {
    return (
      <span className="inline-flex h-5 items-center rounded-[3px] bg-warn-soft px-1.5 font-mono text-[11.5px] font-semibold text-warn">
        partial
      </span>
    );
  }
  if (value === "n/a") {
    return (
      <span
        aria-label="Nothing to draw"
        className="font-mono text-xs font-medium text-muted"
      >
        n/a
      </span>
    );
  }
  return (
    <span aria-label="Not yet" className="text-muted">
      —
    </span>
  );
}

/**
 * The supported commands, generated from the code, with a filter. The page
 * passes the same tables in Markdown as children, for its Markdown export;
 * they aren't rendered.
 */
export function CommandsTable() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("All");
  // Spaces are ignored, so "barcode" finds Zebra's "bar code"
  const squash = (text: string) => text.toLowerCase().replace(/\s+/g, "");
  const q = squash(query);

  const matches = (command: Command) => {
    const text = squash(
      [command.code, command.name, command.note, command.category].join(" ")
    );
    if (q && !text.includes(q)) return false;
    if (mode === "Drawn") return command.rendered;
    if (mode === "Gaps") return isGap(command);
    return true;
  };

  const groups = data.categories
    .map((category) => {
      const all = data.commands.filter((c) => c.category === category);
      return { category, total: all.length, rows: all.filter(matches) };
    })
    .filter((group) => group.rows.length);
  const shown = groups.reduce((sum, group) => sum + group.rows.length, 0);

  return (
    <div className="not-prose @container mt-6">
      <div className="mb-3 flex flex-wrap gap-x-[18px] gap-y-2 text-[13.5px] text-muted">
        <span className="flex items-center gap-1.5">
          <Mark value="yes" /> Supported
        </span>
        <span className="flex items-center gap-1.5">
          <Mark value="partial" /> See notes
        </span>
        <span className="flex items-center gap-1.5">
          <Mark value="no" /> Not yet
        </span>
        <span className="flex items-center gap-1.5">
          <Mark value="n/a" /> Nothing to draw
        </span>
      </div>

      <div className="sticky top-[var(--fd-header-height,0px)] z-20 -mx-1 flex flex-wrap items-center gap-2.5 border-b border-rule-strong bg-bg px-1 py-2.5">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter: ^BC, barcode, font…"
          aria-label="Filter commands"
          className="h-10 min-w-0 flex-[1_1_220px] rounded border border-rule-strong bg-raised px-3 font-mono text-sm"
        />
        <div
          role="radiogroup"
          aria-label="Show"
          className="flex overflow-hidden rounded border border-rule-strong"
        >
          {(["All", "Drawn", "Gaps"] as const).map((label) => (
            <button
              key={label}
              role="radio"
              aria-checked={label === mode}
              onClick={() => setMode(label)}
              className={`h-[38px] border-r border-rule px-3 text-[13px] font-semibold [outline-offset:-2px] last:border-r-0 ${
                label === mode ? "bg-ink text-bg" : "bg-raised text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="whitespace-nowrap font-mono text-[12.5px] font-medium text-muted">
          {shown} of {data.commands.length}
        </span>
      </div>

      <div className="flex flex-col gap-7 pb-16 pt-2">
        {groups.map((group) => (
          <section key={group.category} className="flex flex-col gap-2.5">
            <h2 className="mt-4 flex items-baseline gap-2.5 text-[22px] font-extrabold [font-stretch:108%]">
              {group.category}
              <span className="font-mono text-[12.5px] font-medium text-muted">
                {group.rows.length} of {group.total}
              </span>
            </h2>
            <div className="rounded-md border border-rule-strong">
              <table className="w-full table-fixed border-separate border-spacing-0 text-sm leading-[1.4]">
                <thead>
                  <tr className="text-left">
                    {[
                      ["Command", "@[640px]:w-24"],
                      ["Name", "hidden w-[30%] @[640px]:table-cell"],
                      ["Read/write", "w-[92px] text-center"],
                      ["Drawn", "w-[76px] text-center"],
                      ["Notes", "hidden @[640px]:table-cell"],
                    ].map(([label, className]) => (
                      <th
                        key={label}
                        className={`sticky top-[calc(var(--fd-header-height,0px)+61px)] z-10 border-b border-rule-strong bg-surface px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-muted first:rounded-tl-md last:rounded-tr-md ${className}`}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((command) => (
                    <tr
                      key={command.code}
                      id={anchorOf(command.code)}
                      className="scroll-mt-40 hover:bg-surface target:bg-accent-soft"
                    >
                      <td className="border-b border-rule px-3 py-[7px] align-top">
                        <a
                          href={`#${anchorOf(command.code)}`}
                          className="font-mono text-sm font-semibold text-ink hover:text-accent"
                        >
                          {command.code}
                        </a>
                        <div className="flex flex-col @[640px]:hidden">
                          <span className="text-[13.5px] text-muted">
                            {command.name}
                          </span>
                          {command.note && (
                            <span className="text-[12.5px] text-warn">
                              {command.note}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="hidden border-b border-rule px-3 py-[7px] @[640px]:table-cell">
                        {command.name}
                      </td>
                      <td className="border-b border-rule px-3 py-[7px] text-center">
                        <Mark value={command.parsed ? "yes" : "no"} />
                      </td>
                      <td className="border-b border-rule px-3 py-[7px] text-center">
                        <Mark value={command.drawn as Drawn} />
                      </td>
                      <td className="hidden border-b border-rule px-3 py-[7px] text-[13.5px] text-muted @[640px]:table-cell">
                        {command.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
        {shown === 0 && (
          <p className="text-muted">No commands match “{query}”.</p>
        )}
      </div>
    </div>
  );
}
