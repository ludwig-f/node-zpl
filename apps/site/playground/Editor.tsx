"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { lintGutter, setDiagnostics } from "@codemirror/lint";
import { zplHighlighting, zplLanguage } from "./zpl-language";
import type { Problem } from "./analyze";

type EditorHandle = {
  /** Select a range and scroll it into view */
  select: (from: number, to: number) => void;
};

type EditorProps = {
  value: string;
  problems: Problem[];
  onChange: (value: string) => void;
};

const theme = EditorView.theme({
  "&": { height: "100%", fontSize: "14px", backgroundColor: "var(--panel)" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "var(--font-code)", lineHeight: "1.65" },
  ".cm-content": { padding: "12px 0", caretColor: "var(--accent)" },
  ".cm-gutters": {
    backgroundColor: "var(--panel)",
    color: "var(--muted)",
    border: "none",
  },
  ".cm-activeLine, .cm-activeLineGutter": {
    backgroundColor: "var(--active-line)",
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "var(--selection) !important",
  },
  ".cm-cursor": { borderLeftColor: "var(--accent)", borderLeftWidth: "2px" },
  ".cm-lintRange-warning": {
    backgroundImage: "none",
    textDecoration: "underline wavy var(--warn) 1.5px",
    textUnderlineOffset: "4px",
  },
  ".cm-lintRange-error": {
    backgroundImage: "none",
    textDecoration: "underline wavy var(--error) 1.5px",
    textUnderlineOffset: "4px",
  },
  ".cm-tooltip": {
    background: "var(--panel)",
    border: "1px solid var(--line)",
    color: "var(--ink)",
    fontFamily: "var(--font-ui)",
  },
});

/** CodeMirror editor for ZPL, showing problems as underlines */
const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { value, problems, onChange },
  ref
) {
  const container = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | undefined>(undefined);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    view.current = new EditorView({
      parent: container.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ "aria-label": "ZPL" }),
          zplLanguage,
          zplHighlighting,
          lintGutter(),
          theme,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
        ],
      }),
    });

    return () => view.current?.destroy();
    // The editor is created once; later values are synced below
  }, []);

  // Replace the text when it changes from outside, e.g. picking an example
  useEffect(() => {
    const current = view.current;
    if (current && current.state.doc.toString() !== value) {
      current.dispatch({
        changes: { from: 0, to: current.state.doc.length, insert: value },
      });
    }
  }, [value]);

  useEffect(() => {
    const current = view.current;
    if (!current) return;
    const length = current.state.doc.length;

    current.dispatch(
      setDiagnostics(
        current.state,
        problems
          .filter((problem) => problem.to <= length)
          .map((problem) => ({
            from: problem.from,
            to: problem.to,
            severity: problem.severity,
            message: problem.message,
          }))
      )
    );
  }, [problems]);

  useImperativeHandle(ref, () => ({
    select(from, to) {
      const current = view.current;
      if (!current) return;
      current.dispatch({
        selection: { anchor: from, head: to },
        scrollIntoView: true,
      });
      current.focus();
    },
  }));

  return <div className="editor" ref={container} />;
});

export type { EditorHandle };
export default Editor;
