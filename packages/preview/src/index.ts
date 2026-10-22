/**
 * <zpl-preview>: shows ZPL as images, rendered locally in the browser by
 * zpl-renderer-js (zebrash compiled to WebAssembly). Importing this module
 * registers the element.
 */

/** What the element asks a renderer for */
type RenderOptions = {
  widthMm: number;
  heightMm: number;
  dpmm: number;
  /** Anti-aliased 8-bit output instead of the printer's 1-bit dots */
  grayscale: boolean;
};

/** Renders ZPL to one base64-encoded PNG per label */
type Render = (zpl: string, options: RenderOptions) => Promise<string[]>;

/** Anything with a toZPL() method, such as a node-zpl Label */
type ZplSource = string | { toZPL(): string };

type ZplRendererModule = {
  zplToBase64MultipleAsync: (
    zpl: string,
    widthMm: number,
    heightMm: number,
    dpmm: number,
    options: { grayscaleOutput: boolean }
  ) => Promise<string[]>;
};

const fromZplRendererJs =
  (module: ZplRendererModule): Render =>
  (zpl, { widthMm, heightMm, dpmm, grayscale }) =>
    module.zplToBase64MultipleAsync(zpl, widthMm, heightMm, dpmm, {
      grayscaleOutput: grayscale,
    });

let wasmUrl: string | undefined;
let renderer: Promise<Render> | undefined;

/**
 * Change how previews are rendered. Call it before the first preview renders.
 * @param options.wasmUrl Load zpl-renderer-js's WebAssembly (zebrash.wasm) from this URL instead of the copy bundled into the JavaScript
 * @param options.render Use your own renderer, e.g. one that calls an API
 */
const configure = (options: {
  wasmUrl?: string | URL;
  render?: Render;
}): void => {
  if (options.wasmUrl !== undefined) {
    if (renderer) {
      throw new Error(
        "configure({ wasmUrl }) has to be called before the first <zpl-preview> renders"
      );
    }
    wasmUrl = String(options.wasmUrl);
  }

  if (options.render) {
    renderer = Promise.resolve(options.render);
  }
};

// The renderer is about 7 MB, so it's only loaded once something is rendered
const loadRenderer = (): Promise<Render> =>
  (renderer ??= wasmUrl
    ? import("zpl-renderer-js/external").then(async (module) => {
        await module.init({ wasmUrl: wasmUrl as string });
        return fromZplRendererJs(module);
      })
    : import("zpl-renderer-js").then(fromZplRendererJs));

const DEFAULT_SMOOTHING = 0.4;

/** Default size when neither attributes nor ^PW/^LL give one: 4 × 6 inches */
const DEFAULT_SIZE_MM = { width: 101.6, height: 152.4 };

/** The last value of a command like ^PW800 in the ZPL, if any */
const lastValue = (zpl: string, command: string): number | undefined => {
  const matches = [...zpl.matchAll(new RegExp(`\\^${command}(\\d+)`, "g"))];
  const value = matches[matches.length - 1]?.[1];
  return value === undefined ? undefined : Number(value);
};

const template = `
<style>
  :host { display: inline-block; }
  [part="labels"] { display: flex; flex-direction: column; gap: 8px; }
  img { display: block; max-width: 100%; height: auto; background: #fff; }
  [part="error"] { color: #b3261e; font: 13px/1.4 ui-monospace, monospace; white-space: pre-wrap; }
</style>
<div part="labels"></div>
<div part="error" role="alert" hidden></div>
`;

import { smoothPng } from "./smooth.js";

// Lets the module load where there is no DOM, e.g. during server rendering
const Base = (
  typeof HTMLElement === "undefined" ? class {} : HTMLElement
) as typeof HTMLElement;

/**
 * Shows ZPL as images, one per label.
 *
 * Attributes: `zpl`, `width` and `height` (label size in millimeters, taken
 * from ^PW and ^LL when left out), `dpmm` (dots per millimeter, default 8)
 * and `smoothing` (0 for the printer's exact dots to 1 for fully
 * anti-aliased edges, default 0.4).
 *
 * Events: `zpl-render` with `detail.images` (PNG data URLs) and
 * `zpl-error` with `detail.error`.
 */
class ZplPreview extends Base {
  static observedAttributes = ["zpl", "width", "height", "dpmm", "smoothing"];

  #zpl: ZplSource = "";
  #renderId = 0;
  #scheduled = false;
  #labels: HTMLElement;
  #error: HTMLElement;

  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = template;
    this.#labels = root.querySelector('[part="labels"]') as HTMLElement;
    this.#error = root.querySelector('[part="error"]') as HTMLElement;
  }

  /** The ZPL to show, or anything with a toZPL() method */
  get zpl(): ZplSource {
    return this.#zpl;
  }

  set zpl(value: ZplSource) {
    this.#zpl = value;
    this.#schedule();
  }

  /** Label width in millimeters */
  get width(): number | undefined {
    return this.#number("width");
  }

  set width(value: number | undefined) {
    this.#setNumber("width", value);
  }

  /** Label height in millimeters */
  get height(): number | undefined {
    return this.#number("height");
  }

  set height(value: number | undefined) {
    this.#setNumber("height", value);
  }

  /** Dots per millimeter: 6, 8, 12 or 24 for 152, 203, 300 or 600 dpi */
  get dpmm(): number | undefined {
    return this.#number("dpmm");
  }

  set dpmm(value: number | undefined) {
    this.#setNumber("dpmm", value);
  }

  /**
   * How much to smooth edges: 0 shows the printer's dots exactly, 1 is fully
   * anti-aliased. Defaults to 0.4, which takes off the roughest edges.
   */
  get smoothing(): number {
    const value = this.#number("smoothing");
    return value === undefined || Number.isNaN(value)
      ? DEFAULT_SMOOTHING
      : Math.min(1, Math.max(0, value));
  }

  set smoothing(value: number) {
    this.#setNumber("smoothing", value);
  }

  connectedCallback(): void {
    this.#schedule();
  }

  attributeChangedCallback(
    name: string,
    _old: string | null,
    value: string | null
  ): void {
    if (name === "zpl") {
      this.#zpl = value ?? "";
    }
    this.#schedule();
  }

  #number(name: string): number | undefined {
    const value = this.getAttribute(name);
    return value === null || value === "" ? undefined : Number(value);
  }

  #setNumber(name: string, value: number | undefined): void {
    if (value === undefined) {
      this.removeAttribute(name);
    } else {
      this.setAttribute(name, String(value));
    }
  }

  /** Render once after the current batch of changes */
  #schedule(): void {
    if (this.#scheduled) return;
    this.#scheduled = true;
    queueMicrotask(() => {
      this.#scheduled = false;
      void this.#render();
    });
  }

  async #render(): Promise<void> {
    const id = ++this.#renderId;
    const zpl = typeof this.#zpl === "string" ? this.#zpl : this.#zpl.toZPL();

    if (!zpl.trim()) {
      this.#show([], undefined);
      return;
    }

    const dpmm = this.dpmm ?? 8;
    const smoothing = this.smoothing;
    const width =
      this.width ??
      (lastValue(zpl, "PW") ?? DEFAULT_SIZE_MM.width * dpmm) / dpmm;
    const height =
      this.height ??
      (lastValue(zpl, "LL") ?? DEFAULT_SIZE_MM.height * dpmm) / dpmm;

    try {
      const render = await loadRenderer();
      const pngs = await render(zpl, {
        widthMm: width,
        heightMm: height,
        dpmm,
        grayscale: smoothing > 0,
      });
      const images = await Promise.all(
        pngs.map((png) =>
          smoothing > 0 && smoothing < 1
            ? smoothPng(png, smoothing)
            : `data:image/png;base64,${png}`
        )
      );

      // A newer render started while this one was running
      if (id !== this.#renderId) return;

      this.#show(images, undefined);
      this.dispatchEvent(new CustomEvent("zpl-render", { detail: { images } }));
    } catch (thrown) {
      if (id !== this.#renderId) return;

      const error =
        thrown instanceof Error ? thrown : new Error(String(thrown));
      this.#show([], error);
      this.dispatchEvent(new CustomEvent("zpl-error", { detail: { error } }));
    }
  }

  #show(images: string[], error: Error | undefined): void {
    this.#labels.replaceChildren(
      ...images.map((src, index) => {
        const image = document.createElement("img");
        image.src = src;
        image.alt =
          images.length === 1
            ? "Label"
            : `Label ${index + 1} of ${images.length}`;
        return image;
      })
    );
    this.#error.textContent = error ? error.message : "";
    this.#error.hidden = !error;
  }
}

if (
  typeof customElements !== "undefined" &&
  !customElements.get("zpl-preview")
) {
  customElements.define("zpl-preview", ZplPreview);
}

declare global {
  interface HTMLElementTagNameMap {
    "zpl-preview": ZplPreview;
  }
}

export type { ZplSource, Render, RenderOptions };
export { ZplPreview, configure };
