"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "@zplkit/preview/react";
import "./styles.css";
import Editor from "./Editor";
import Bench from "./Bench";
import examples from "./examples";
import { analyze } from "./analyze";
import { decodeShare, encodeShare } from "./share";
import type { EditorHandle } from "./Editor";
import type { Problem } from "./analyze";
import type { ShareState } from "./share";

// Kept from before the rename, so saved labels stay
const STORAGE_KEY = "node-zpl-playground";

/** Smoothing when "Smooth edges" is on; off shows the printer's exact dots */
const SMOOTHING = 0.4;

const fileName = (name: string) =>
  `${name.toLowerCase().replace(/\s+/g, "-")}.zpl`;

const fromExample = (index: number): ShareState => {
  const { zpl, widthMm, heightMm, dpmm } = examples[index];
  return { zpl, widthMm, heightMm, dpmm, smoothing: SMOOTHING };
};

const loadSaved = (): ShareState | undefined => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as ShareState) : undefined;
  } catch {
    return undefined;
  }
};

/** Common label sizes in millimeters */
const sizes = [
  { id: "4x6", label: "4 × 6 in", width: 101.6, height: 152.4 },
  { id: "4x4", label: "4 × 4 in", width: 101.6, height: 101.6 },
  { id: "4x2", label: "4 × 2 in", width: 101.6, height: 50.8 },
  { id: "2x1", label: "2 × 1 in", width: 50.8, height: 25.4 },
  { id: "100x150", label: "100 × 150 mm", width: 100, height: 150 },
  { id: "57x32", label: "57 × 32 mm", width: 57, height: 32 },
];

const resolutions = [
  { dpmm: 6, dpi: 152 },
  { dpmm: 8, dpi: 203 },
  { dpmm: 12, dpi: 300 },
  { dpmm: 24, dpi: 600 },
];

/** The last value of a command like ^PW800 in the ZPL, if any */
const lastValue = (zpl: string, command: string): number | undefined => {
  const matches = [...zpl.matchAll(new RegExp(`\\^${command}(\\d+)`, "g"))];
  const value = matches[matches.length - 1]?.[1];
  return value === undefined ? undefined : Number(value);
};

const parseMm = (text: string): number | undefined => {
  const value = Number(text.replace(",", "."));
  return text.trim() && Number.isFinite(value) && value > 0 ? value : undefined;
};

/** Why the label wouldn't print at all, if it wouldn't */
const blockingReason = (problems: Problem[]) => {
  const rules = new Set(problems.map((problem) => problem.rule));
  if (rules.has("missing-end-format")) {
    return "the format is never closed with ^XZ";
  }
  if (rules.has("missing-start-format")) {
    return "commands come before the format starts with ^XA";
  }
  return undefined;
};

type Tab = "Editor" | "Preview" | "Problems";

function ProblemList({
  problems,
  onSelect,
}: {
  problems: Problem[];
  onSelect: (problem: Problem) => void;
}) {
  if (problems.length === 0) {
    return <p className="clean">No problems. This label prints as shown.</p>;
  }
  return (
    <ul>
      {problems.map((problem, index) => (
        <li key={index} className={`problem ${problem.severity}`}>
          <button
            type="button"
            className="line"
            onClick={() => onSelect(problem)}
            aria-label={`Go to line ${problem.line}`}
          >
            L{problem.line}
          </button>
          <div>
            <span className="rule">
              <span className="marker" aria-hidden="true" />
              {problem.severity} · {problem.rule}
            </span>
            <span className="message">{problem.message}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Playground() {
  const [state, setState] = useState<ShareState>(
    () => loadSaved() ?? fromExample(0)
  );
  const [name, setName] = useState("label.zpl");
  const [images, setImages] = useState<string[]>([]);
  const [notice, setNotice] = useState<string>();
  const [tab, setTab] = useState<Tab>("Editor");
  const [render, setRender] = useState<{ busy: boolean; ms?: number }>({
    busy: true,
  });
  const editor = useRef<EditorHandle>(null);
  const { zpl, widthMm, heightMm, dpmm, smoothing } = state;
  const update = (changes: Partial<ShareState>) =>
    setState((current) => ({ ...current, ...changes }));

  // Open shared links
  useEffect(() => {
    const hash = location.hash.slice(1);
    if (!hash) return;
    void decodeShare(hash).then((shared) => {
      if (shared) setState(shared);
      else setNotice("This link doesn't contain a label.");
    });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage can be unavailable, e.g. in private windows
    }
  }, [state]);

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(undefined), 2500);
    return () => clearTimeout(timeout);
  }, [notice]);

  const problems = useMemo(
    () => analyze(zpl, { dpmm, widthMm, heightMm }),
    [zpl, dpmm, widthMm, heightMm]
  );
  const blocked = blockingReason(problems);
  // The example shown, until it's edited
  const example = examples.findIndex((option) => option.zpl === zpl);

  // The size the preview uses: settings, then ^PW/^LL, then 4 × 6 in
  const labelSize = {
    width: widthMm ?? ((lastValue(zpl, "PW") ?? 0) / dpmm || 101.6),
    height: heightMm ?? ((lastValue(zpl, "LL") ?? 0) / dpmm || 152.4),
  };
  const size =
    widthMm === undefined && heightMm === undefined
      ? "auto"
      : sizes.find(
          (preset) => preset.width === widthMm && preset.height === heightMm
        )?.id ?? "custom";
  const [custom, setCustom] = useState(size === "custom");
  const sizeValue = custom ? "custom" : size;

  const share = async () => {
    const link = `${location.origin}${location.pathname}#${await encodeShare(
      state
    )}`;
    history.replaceState(null, "", link);
    try {
      await navigator.clipboard.writeText(link);
      setNotice("Link copied");
    } catch {
      setNotice("Link is in the address bar");
    }
  };

  const download = () => {
    images.forEach((src, index) => {
      const link = document.createElement("a");
      link.href = src;
      link.download =
        images.length === 1
          ? name.replace(/\.zpl$/, ".png")
          : name.replace(/\.zpl$/, `-${index + 1}.png`);
      link.click();
    });
  };

  const selectProblem = (problem: Problem) => {
    setTab("Editor");
    // Let the editor show again on phones before selecting
    requestAnimationFrame(() =>
      editor.current?.select(problem.from, problem.to)
    );
  };

  return (
    <div className="playground" data-tab={tab}>
      <div className="toolbar">
        <span className="filename">{name}</span>
        <span className="divider" aria-hidden="true" />
        <label className="field">
          Size
          <select
            value={sizeValue}
            onChange={(event) => {
              const id = event.target.value;
              setCustom(id === "custom");
              if (id === "auto") {
                update({ widthMm: undefined, heightMm: undefined });
              } else if (id !== "custom") {
                const preset = sizes.find((s) => s.id === id)!;
                update({ widthMm: preset.width, heightMm: preset.height });
              }
            }}
          >
            <option value="auto">From ^PW and ^LL</option>
            {sizes.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>
        </label>
        {sizeValue === "custom" && (
          <span className="custom-size">
            <input
              aria-label="Width in millimeters"
              inputMode="decimal"
              placeholder={labelSize.width.toFixed(1)}
              value={widthMm ?? ""}
              onChange={(event) =>
                update({ widthMm: parseMm(event.target.value) })
              }
            />
            ×
            <input
              aria-label="Height in millimeters"
              inputMode="decimal"
              placeholder={labelSize.height.toFixed(1)}
              value={heightMm ?? ""}
              onChange={(event) =>
                update({ heightMm: parseMm(event.target.value) })
              }
            />
            mm
          </span>
        )}
        <div role="radiogroup" aria-label="Resolution" className="segmented">
          {resolutions.map((resolution) => (
            <button
              key={resolution.dpmm}
              type="button"
              role="radio"
              aria-checked={resolution.dpmm === dpmm}
              onClick={() => update({ dpmm: resolution.dpmm })}
            >
              {resolution.dpi}
            </button>
          ))}
        </div>
        <span className="unit">dpi</span>
        <label className="toggle">
          <input
            type="checkbox"
            checked={smoothing > 0}
            onChange={(event) =>
              update({ smoothing: event.target.checked ? SMOOTHING : 0 })
            }
          />
          Smooth edges
        </label>
        <div className="spacer" />
        <select
          aria-label="Open an example"
          value={example === -1 ? "" : example}
          onChange={(event) => {
            const index = Number(event.target.value);
            setState(fromExample(index));
            setName(fileName(examples[index].name));
            setCustom(false);
            history.replaceState(null, "", location.pathname);
          }}
        >
          <option value="" disabled>
            Examples
          </option>
          {examples.map((example, index) => (
            <option key={example.name} value={index}>
              {example.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={share}>
          Share link
        </button>
        <button
          type="button"
          className="primary"
          onClick={download}
          disabled={!images.length}
        >
          Download PNG
        </button>
      </div>

      <div role="tablist" className="tabs">
        {(["Editor", "Preview", "Problems"] as const).map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={id === tab}
            onClick={() => setTab(id)}
          >
            {id === "Problems" ? `Problems (${problems.length})` : id}
          </button>
        ))}
      </div>

      <div className="workspace">
        <section className="code" aria-label="ZPL editor">
          <Editor
            ref={editor}
            value={zpl}
            problems={problems}
            onChange={(value) => update({ zpl: value })}
          />
          <div className="problems" data-open={problems.length > 0}>
            <div className="problems-header">
              <span>Problems · {problems.length}</span>
            </div>
            {/* Collapsed while there's nothing to show, slides open after */}
            <div className="problems-body">
              <div>
                <ProblemList problems={problems} onSelect={selectProblem} />
              </div>
            </div>
          </div>
        </section>

        <section className="problems-tab" aria-label="Problems">
          <ProblemList problems={problems} onSelect={selectProblem} />
        </section>

        <section className="preview" aria-label="Label preview">
          <div className="status" aria-live="polite">
            <span className={render.busy ? "busy" : undefined}>
              {render.busy || render.ms === undefined
                ? "Rendering…"
                : `Rendered in ${render.ms} ms`}
            </span>
            <span>
              {Math.round(labelSize.width * dpmm)} ×{" "}
              {Math.round(labelSize.height * dpmm)} dots
            </span>
          </div>
          {blocked && (
            <p className="blocked">
              This label would not print: {blocked}. Shown for reference.
            </p>
          )}
          <div className={`bench-area${blocked ? " dimmed" : ""}`}>
            <Bench widthMm={labelSize.width} heightMm={labelSize.height}>
              <zpl-preview
                zpl={zpl}
                width={widthMm}
                height={heightMm}
                dpmm={dpmm}
                smoothing={smoothing}
                fade
                onzpl-render-start={() =>
                  setRender((current) => ({ ...current, busy: true }))
                }
                onzpl-render={(event) => {
                  setImages(event.detail.images);
                  setRender({ busy: false, ms: event.detail.duration });
                }}
                onzpl-error={() => {
                  setImages([]);
                  setRender({ busy: false });
                }}
              />
            </Bench>
          </div>
        </section>
      </div>

      <div className="notice" role="status" aria-live="polite">
        {notice}
      </div>
    </div>
  );
}
