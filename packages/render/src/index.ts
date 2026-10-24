import { encodePng } from "./png.js";
import { renderLabels } from "./render.js";
import type { RenderOptions } from "./render.js";

const toBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

/**
 * Render ZPL to one base64-encoded PNG per label. The signature matches what
 * @node-zpl/preview expects from a renderer, so it can be passed to
 * `configure({ render: renderZpl })`.
 * @param options.grayscale Anti-aliased edges instead of the printer's whole dots
 * @param options.fonts Fonts already on the printer, by path like "E:ARIAL.TTF"
 */
const renderZpl = async (
  zpl: string,
  options: {
    widthMm: number;
    heightMm: number;
    dpmm: number;
    grayscale: boolean;
    fonts?: Record<string, Uint8Array>;
  }
): Promise<string[]> => {
  const rasters = renderLabels(zpl, {
    ...options,
    antialias: options.grayscale,
  });
  return Promise.all(
    rasters.map(async (raster) => toBase64(await encodePng(raster)))
  );
};

export type { RenderOptions };
export type { Path, Point, Color, Sampling } from "./raster.js";
export type { Element, LabelLayout, LayoutOptions } from "./layout.js";
export { renderZpl, renderLabels, encodePng };
export { Raster, fillPath } from "./raster.js";
export { layout } from "./layout.js";
