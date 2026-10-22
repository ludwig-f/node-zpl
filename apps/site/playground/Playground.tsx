"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "@node-zpl/preview/react";
import "./styles.css";
import Editor from "./Editor";
import Bench from "./Bench";
import examples from "./examples";
import { analyze } from "./analyze";
import { decodeShare, encodeShare } from "./share";
import type { EditorHandle } from "./Editor";
import type { ShareState } from "./share";

const STORAGE_KEY = "node-zpl-playground";

const fromExample = (index: number): ShareState => ({
  ...examples[index],
  smoothing: 0.4,
});

const loadSaved = (): ShareState | undefined => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as ShareState) : undefined;
  } catch {
    return undefined;
  }
};

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

export default function Playground() {
  const [state, setState] = useState<ShareState>(
    () => loadSaved() ?? fromExample(0)
  );
  const [images, setImages] = useState<string[]>([]);
  const [notice, setNotice] = useState<string>();
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

  // The size the preview uses, for the ruler: settings, then ^PW/^LL, then 4 × 6 in
  const labelSize = {
    width: widthMm ?? ((lastValue(zpl, "PW") ?? 0) / dpmm || 101.6),
    height: heightMm ?? ((lastValue(zpl, "LL") ?? 0) / dpmm || 152.4),
  };

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
        images.length === 1 ? "label.png" : `label-${index + 1}.png`;
      link.click();
    });
  };

  const errors = problems.filter((p) => p.severity === "error").length;
  const warnings = problems.length - errors;

  return (
    <div className="playground">
      <header className="topbar">
        <h1>Playground</h1>
        <div className="actions">
          <label className="field">
            <span>Example</span>
            <select
              id="example"
              value=""
              onChange={(event) => {
                const index = Number(event.target.value);
                setState(fromExample(index));
                history.replaceState(null, "", location.pathname);
              }}
            >
              <option value="" disabled>
                Open an example
              </option>
              {examples.map((example, index) => (
                <option key={example.name} value={index}>
                  {example.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={share}>
            Copy share link
          </button>
          <button type="button" onClick={download} disabled={!images.length}>
            Download PNG
          </button>
        </div>
      </header>

      <main className="workspace">
        <section className="code" aria-label="ZPL editor">
          <Editor
            ref={editor}
            value={zpl}
            problems={problems}
            onChange={(value) => update({ zpl: value })}
          />
          <div className="problems">
            <h2>
              {problems.length === 0
                ? "No problems found"
                : [
                    errors && `${errors} error${errors === 1 ? "" : "s"}`,
                    warnings &&
                      `${warnings} warning${warnings === 1 ? "" : "s"}`,
                  ]
                    .filter(Boolean)
                    .join(", ")}
            </h2>
            {problems.length > 0 && (
              <ul>
                {problems.map((problem, index) => (
                  <li key={index}>
                    <button
                      type="button"
                      className={`problem ${problem.severity}`}
                      onClick={() =>
                        editor.current?.select(problem.from, problem.to)
                      }
                    >
                      <span className="where">Line {problem.line}</span>
                      <span className="what">{problem.message}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="bench-panel" aria-label="Label preview">
          <div className="settings">
            <label className="field">
              <span>Width</span>
              <input
                id="width"
                inputMode="decimal"
                placeholder={labelSize.width.toFixed(1)}
                value={widthMm ?? ""}
                onChange={(event) =>
                  update({ widthMm: parseMm(event.target.value) })
                }
              />
              <span className="unit">mm</span>
            </label>
            <label className="field">
              <span>Height</span>
              <input
                id="height"
                inputMode="decimal"
                placeholder={labelSize.height.toFixed(1)}
                value={heightMm ?? ""}
                onChange={(event) =>
                  update({ heightMm: parseMm(event.target.value) })
                }
              />
              <span className="unit">mm</span>
            </label>
            <label className="field">
              <span>Resolution</span>
              <select
                id="dpmm"
                value={dpmm}
                onChange={(event) =>
                  update({ dpmm: Number(event.target.value) })
                }
              >
                <option value={6}>152 dpi</option>
                <option value={8}>203 dpi</option>
                <option value={12}>300 dpi</option>
                <option value={24}>600 dpi</option>
              </select>
            </label>
            <label className="field smoothing">
              <span>Smoothing</span>
              <input
                id="smoothing"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={smoothing}
                onChange={(event) =>
                  update({ smoothing: Number(event.target.value) })
                }
              />
              <output htmlFor="smoothing">
                {smoothing === 0
                  ? "Printer dots"
                  : `${Math.round(smoothing * 100)}%`}
              </output>
            </label>
          </div>

          <Bench widthMm={labelSize.width} heightMm={labelSize.height}>
            <zpl-preview
              zpl={zpl}
              width={widthMm}
              height={heightMm}
              dpmm={dpmm}
              smoothing={smoothing}
              onzpl-render={(event) => setImages(event.detail.images)}
              onzpl-error={() => setImages([])}
            />
          </Bench>
        </section>
      </main>

      <div className="notice" role="status" aria-live="polite">
        {notice}
      </div>
    </div>
  );
}
