/**
 * Drawing barcodes. Each symbology is encoded into bar widths or a module
 * grid, then filled as rectangles in dots, so they land on whole dots and
 * turn with the field like text does: the bottom of the symbol acts as the
 * baseline.
 */
import bwipjs from "bwip-js";
import { encodeCode11 } from "./barcodes/code11.js";
import { encodeCode128 } from "./barcodes/code128.js";
import { encodeCode39 } from "./barcodes/code39.js";
import { encodeEan13 } from "./barcodes/ean13.js";
import { encodeInterleaved2of5 } from "./barcodes/interleaved2of5.js";
import { fillPath } from "./raster.js";
import {
  drawGlyphs,
  faceFor,
  placeLine,
  placement,
  scaledFace,
} from "./text.js";
import type { Element } from "./layout.js";
import type { Color, Raster } from "./raster.js";
import type { Face, Place } from "./text.js";

type Barcode = Extract<Element, { kind: "barcode" }>;
type Placeholder = Extract<Element, { kind: "placeholder" }>;

/** Gaps between the bars and the interpretation line's character cells */
const GAP_BELOW = 6;
const GAP_ABOVE = 8;

/** How far EAN-13 guard bars reach below the others */
const GUARD_EXTENSION = 13;

/** Text under part of the bars, centered on the span from `from` to `to` */
type TextPart = { text: string; from: number; to: number };

type Linear = {
  kind: "linear";
  /** Widths of alternating bars and spaces in dots, starting with a bar */
  widths: number[];
  /** Bars (by index into widths) that reach below the others */
  guards?: number[];
  height: number;
  line?: "below" | "above";
  text: string;
  /** How the text sits below the bars, if not centered as one line */
  below?: TextPart[];
};

type Matrix = {
  kind: "matrix";
  /** Dark modules, row by row */
  modules: number[];
  columns: number;
  moduleSize: number;
  /** Height of each row of modules, if not moduleSize */
  rowHeight?: number;
  /** Moves the symbol down from ^FO, or up from ^FT */
  shift?: { origin: number; typeset: number };
};

/** Pixels from bwip-js for 2D symbols, with options like "eclevel=Q" */
const matrix = (bcid: string, text: string, options: string[] = []) => {
  const [symbol] = bwipjs.raw(bcid, text, options.join(" "));
  if (!("pixs" in symbol)) throw new Error("expected a 2D symbol");
  return { modules: symbol.pixs, columns: symbol.pixx };
};

/** Default QR magnification for each printhead resolution */
const qrMagnification = (dpmm: number) =>
  dpmm <= 6 ? 1 : dpmm <= 8 ? 2 : dpmm <= 12 ? 3 : 6;

/**
 * QR field data starts with the error correction level and input mode,
 * like "QA,": in manual mode a character type (and for bytes, a length)
 * comes before the data
 */
const qrData = (data: string, level: string) => {
  const match = /^([HQML])([AM]),/.exec(data);
  if (!match) return { eclevel: level, text: data };
  let text = data.slice(match[0].length);
  if (match[2] === "M") {
    text = text[0] === "B" ? text.slice(5) : text.slice(1);
  }
  return { eclevel: match[1], text };
};

/**
 * PDF417 columns for a symbol of `count` codewords: the one closest to twice
 * as wide as it's tall, counting each row as 3 modules high, which is how
 * Labelary reads Zebra's default of a 1:2 aspect ratio
 */
const pdf417Columns = (count: number) => {
  let best = 1;
  let bestError = Infinity;
  for (let columns = 1; columns <= 30; columns++) {
    const rows = Math.max(3, Math.ceil(count / columns));
    if (rows > 90) continue;
    const error = Math.abs((3 * rows) / (17 * columns + 69) - 0.5);
    if (error < bestError) {
      best = columns;
      bestError = error;
    }
  }
  return best;
};

const interpretation = (
  shown: boolean | undefined,
  above: boolean | undefined
): Linear["line"] => (shown === false ? undefined : above ? "above" : "below");

const encode = (barcode: Barcode, dpmm: number): Linear | Matrix => {
  const { symbology, data, moduleWidth } = barcode;
  switch (symbology.type) {
    case "Code128": {
      const { widths, text } = encodeCode128(data, symbology.mode);
      return {
        kind: "linear",
        widths: widths.map((w) => w * moduleWidth),
        height: symbology.height ?? barcode.height,
        line: interpretation(
          symbology.interpretationLine,
          symbology.interpretationLineAbove
        ),
        text,
      };
    }
    case "Code11": {
      const wide = Math.round(moduleWidth * barcode.ratio);
      const { widths, text } = encodeCode11(
        data,
        symbology.checkDigits ?? 2,
        moduleWidth,
        wide
      );
      return {
        kind: "linear",
        widths,
        height: symbology.height ?? barcode.height,
        line: interpretation(
          symbology.interpretationLine,
          symbology.interpretationLineAbove
        ),
        // Labelary marks the start and stop characters with triangles; we
        // leave their places blank
        text: ` ${text} `,
      };
    }
    case "Code39":
    case "Interleaved2of5": {
      const encoder =
        symbology.type === "Code39" ? encodeCode39 : encodeInterleaved2of5;
      const { widths, text } = encoder(
        data,
        symbology.checkDigit ?? false,
        moduleWidth,
        Math.round(moduleWidth * barcode.ratio)
      );
      return {
        kind: "linear",
        widths,
        height: symbology.height ?? barcode.height,
        line: interpretation(
          symbology.interpretationLine,
          symbology.interpretationLineAbove
        ),
        text,
      };
    }
    case "Ean13": {
      const { widths, guards, text } = encodeEan13(data);
      const m = moduleWidth;
      return {
        kind: "linear",
        widths: widths.map((w) => w * m),
        guards,
        height: symbology.height ?? barcode.height,
        line: interpretation(
          symbology.interpretationLine,
          symbology.interpretationLineAbove
        ),
        text,
        // The first digit sits left of the bars, the others under each half
        below: [
          { text: text[0], from: -11 * m, to: -11 * m },
          { text: text.slice(1, 7), from: 3 * m, to: 45 * m },
          { text: text.slice(7), from: 50 * m, to: 92 * m },
        ],
      };
    }
    case "Pdf417": {
      const options = [`eclevel=${symbology.securityLevel ?? 0}`, "rowmult=1"];
      if (symbology.truncate) options.push("compact");
      if (symbology.rows) options.push(`rows=${symbology.rows}`);
      let columns = symbology.columns;
      if (!columns && !symbology.rows) {
        // In one column, there's a row for each codeword
        const single = matrix("pdf417", data, [...options, "columns=1"]);
        columns = pdf417Columns(single.modules.length / single.columns);
      }
      if (columns) options.push(`columns=${columns}`);
      const symbol = matrix("pdf417", data, options);
      const rows = symbol.modules.length / symbol.columns;
      return {
        kind: "matrix",
        ...symbol,
        moduleSize: moduleWidth,
        rowHeight:
          symbology.rowHeight ?? Math.max(1, Math.floor(barcode.height / rows)),
      };
    }
    case "QrCode": {
      const size = symbology.magnification ?? qrMagnification(dpmm);
      const { eclevel, text } = qrData(data, symbology.errorCorrection ?? "Q");
      return {
        kind: "matrix",
        ...matrix("qrcode", text, [`eclevel=${eclevel}`]),
        moduleSize: size,
        shift: { origin: 10, typeset: 3 * size },
      };
    }
    case "DataMatrix": {
      const options = [];
      if (symbology.columns) options.push(`columns=${symbology.columns}`);
      if (symbology.rows) options.push(`rows=${symbology.rows}`);
      return {
        kind: "matrix",
        ...matrix("datamatrix", data, options),
        moduleSize: symbology.height ?? 1,
      };
    }
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

const advanceOf = (face: Face, text: string) => {
  let advance = 0;
  for (const char of text) advance += face.advance(char);
  return advance;
};

const drawLinear = (
  raster: Raster,
  barcode: Barcode,
  symbol: Linear,
  dpmm: number,
  color: Color
) => {
  const { widths, height, line } = symbol;
  const width = widths.reduce((sum, w) => sum + w, 0);
  const place = placement(
    { width, height, ascent: height, lastBaseline: 0 },
    barcode
  );

  const guards = new Set(symbol.guards);
  const extension = symbol.guards ? GUARD_EXTENSION : 0;
  let u = 0;
  widths.forEach((w, i) => {
    if (i % 2 === 0) {
      const bottom = guards.has(i) ? extension : 0;
      fillRect(raster, place, u, -height, u + w, bottom, color);
    }
    u += w;
  });

  if (!line || !symbol.text) return;
  const face = interpretationFace(barcode, dpmm);
  if (line === "below" && symbol.below) {
    // Laid out under the bars, between the guards
    const top = barcode.moduleWidth > 2 ? 2 * barcode.moduleWidth : 4;
    for (const { text, from, to } of symbol.below) {
      const advance = advanceOf(face, text);
      const start = from === to ? from : (from + to - advance) / 2;
      const glyphs = placeLine(face, text, start, top + face.ascent);
      drawGlyphs(raster, glyphs, place, color);
    }
    return;
  }

  const top =
    line === "below"
      ? GAP_BELOW + extension
      : -height - GAP_ABOVE - face.height;
  const advance = advanceOf(face, symbol.text);
  const glyphs = placeLine(
    face,
    symbol.text,
    (width - advance) / 2,
    top + face.ascent
  );
  drawGlyphs(raster, glyphs, place, color);
};

const drawMatrix = (
  raster: Raster,
  barcode: Barcode,
  symbol: Matrix,
  color: Color
) => {
  const { modules, columns, moduleSize } = symbol;
  const rowHeight = symbol.rowHeight ?? moduleSize;
  const rows = modules.length / columns;
  const size = columns * moduleSize;
  const height = rows * rowHeight;
  const shift = symbol.shift;
  const y = barcode.fromBottom
    ? barcode.y - (shift?.typeset ?? 0)
    : barcode.y + (shift?.origin ?? 0);
  const place = placement(
    { width: size, height, ascent: height, lastBaseline: 0 },
    { ...barcode, y }
  );

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      if (!modules[row * columns + column]) continue;
      const u = column * moduleSize;
      const v = row * rowHeight - height;
      fillRect(raster, place, u, v, u + moduleSize, v + rowHeight, color);
    }
  }
};

const drawBarcode = (
  raster: Raster,
  barcode: Barcode,
  dpmm: number,
  color: Color
): void => {
  const symbol = encode(barcode, dpmm);
  if (symbol.kind === "linear") {
    drawLinear(raster, barcode, symbol, dpmm, color);
  } else {
    drawMatrix(raster, barcode, symbol, color);
  }
};

/**
 * A crossed-out box in place of a barcode we can't draw yet, naming the
 * command, so a preview doesn't silently leave it out
 */
const drawPlaceholder = (
  raster: Raster,
  placeholder: Placeholder,
  dpmm: number,
  color: Color
): void => {
  const text =
    placeholder.reason === "invalid"
      ? `${placeholder.code} has invalid parameters`
      : `${placeholder.code} not supported`;
  // Font D, magnified so it stays legible at higher resolutions
  const face = faceFor({
    font: "D",
    height: 18 * Math.max(1, Math.round(dpmm / 8)),
    dpmm,
  });
  const advance = advanceOf(face, text);
  const padding = face.height;
  const width = Math.ceil(advance + 2 * padding);
  const line = Math.max(1, Math.round(dpmm / 4));
  // Room for the text and the diagonals around it, whatever ^BY's height
  const height = Math.max(placeholder.height, 2 * face.height + 2 * line);
  const place = placement(
    { width, height, ascent: height, lastBaseline: 0 },
    placeholder
  );
  // Outline and diagonals, with the bottom edge at v = 0
  fillRect(raster, place, 0, -height, width, -height + line, color);
  fillRect(raster, place, 0, -line, width, 0, color);
  fillRect(raster, place, 0, -height, line, 0, color);
  fillRect(raster, place, width - line, -height, width, 0, color);
  fillPath(
    raster,
    [
      [
        place(0, -height),
        place(0, -height + line),
        place(width, 0),
        place(width, -line),
      ],
      [
        place(0, 0),
        place(0, -line),
        place(width, -height + line),
        place(width, -height),
      ],
    ],
    color
  );

  // The name on a clear band across the middle
  const top = (-height - face.height) / 2;
  const clear = color === "B" ? "W" : "B";
  fillRect(
    raster,
    place,
    padding / 2,
    top - 2,
    width - padding / 2,
    top + face.height + 2,
    clear
  );
  const glyphs = placeLine(face, text, padding, top + face.ascent);
  drawGlyphs(raster, glyphs, place, color);
};

export { drawBarcode, drawPlaceholder };
