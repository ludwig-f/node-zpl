/**
 * Drawing barcodes. Each symbology is encoded into module widths, then the
 * bars are filled as rectangles in dots, so they land on whole dots and turn
 * with the field like text does: the bottom of the bars acts as the baseline.
 */
import { encodeCode128 } from "./barcodes/code128.js";
import { fillPath } from "./raster.js";
import {
  drawGlyphs,
  faceFor,
  placeLine,
  placement,
  scaledFace,
} from "./text.js";
import type { Element } from "./layout.js";
import type { LinearSymbol } from "./barcodes/linear.js";
import type { Color, Raster } from "./raster.js";
import type { Face, Place } from "./text.js";

type Barcode = Extract<Element, { kind: "barcode" }>;

/** Gaps between the bars and the interpretation line's character cells */
const GAP_BELOW = 6;
const GAP_ABOVE = 8;

const encode = (
  barcode: Barcode
): { symbol: LinearSymbol; height: number; line?: "below" | "above" } => {
  const { symbology } = barcode;
  switch (symbology.type) {
    case "Code128":
      return {
        symbol: encodeCode128(barcode.data, symbology.mode),
        height: symbology.height ?? barcode.height,
        line:
          symbology.interpretationLine === false
            ? undefined
            : symbology.interpretationLineAbove
            ? "above"
            : "below",
      };
    default:
      throw new Error(`${symbology.type} isn't supported yet`);
  }
};

/** Fill the rectangle from (u0, v0) to (u1, v1) in barcode coordinates */
const fillRect = (
  raster: Raster,
  place: Place,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  color: Color
) =>
  fillPath(
    raster,
    [[place(u0, v0), place(u1, v0), place(u1, v1), place(u0, v1)]],
    color
  );

/**
 * The interpretation line's font: the field's ^A font if it had one,
 * otherwise font D at half the module width
 */
const interpretationFace = (barcode: Barcode, dpmm: number): Face =>
  barcode.font
    ? faceFor({ ...barcode.font, dpmm })
    : scaledFace("D", barcode.moduleWidth / 2, dpmm);

const drawBarcode = (
  raster: Raster,
  barcode: Barcode,
  dpmm: number,
  color: Color
): void => {
  const { symbol, height, line } = encode(barcode);
  const module = barcode.moduleWidth;
  const width = symbol.widths.reduce((sum, w) => sum + w, 0) * module;
  const place = placement(
    { width, height, ascent: height, lastBaseline: 0 },
    barcode
  );

  let u = 0;
  symbol.widths.forEach((w, i) => {
    if (i % 2 === 0)
      fillRect(raster, place, u, -height, u + w * module, 0, color);
    u += w * module;
  });

  if (!line || !symbol.text) return;
  const face = interpretationFace(barcode, dpmm);
  let advance = 0;
  for (const char of symbol.text) advance += face.advance(char);
  const top = line === "below" ? GAP_BELOW : -height - GAP_ABOVE - face.height;
  const glyphs = placeLine(
    face,
    symbol.text,
    (width - advance) / 2,
    top + face.ascent
  );
  drawGlyphs(raster, glyphs, place, color);
};

export { drawBarcode };
