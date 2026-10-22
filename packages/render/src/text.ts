/**
 * Drawing text in ZPL's built-in fonts with open-licensed stand-ins.
 *
 * Font 0 is scalable: letter shapes come from Archivo, stretched to the
 * advance widths measured from Labelary's font 0, so text takes up the same
 * room as on a printer.
 *
 * Fonts A to H are bitmap fonts with fixed character cells that can only be
 * magnified in whole steps. Letter shapes come from DejaVu Sans Mono, placed
 * in each cell where Labelary prints them.
 */
import { parseFont, flattenGlyph } from "./font.js";
import { font0Advances, font0Data } from "./fonts/font0.js";
import { dejavuMonoBoldData, dejavuMonoData } from "./fonts/dejavu.js";
import { fillPath } from "./raster.js";
import type { Font } from "./font.js";
import type { Color, Raster } from "./raster.js";

/** Font 0's capitals are three quarters of the character height */
const CAP_HEIGHT = 0.75;

/** What a character font 0 doesn't have advances, per 100 dots of width */
const MISSING_ADVANCE = 29.5;

const decodeBase64 = (data: string) =>
  Uint8Array.from(atob(data), (char) => char.charCodeAt(0));

const cache = new Map<string, Font>();
const load = (name: string, data: string): Font => {
  let font = cache.get(name);
  if (!font) {
    font = parseFont(decodeBase64(data));
    cache.set(name, font);
  }
  return font;
};

let font0Widths: Map<number, number> | undefined;
const font0AdvanceTable = () =>
  (font0Widths ??= new Map(
    font0Advances.split(",").map((pair) => {
      const [code, width] = pair.split(":");
      return [parseInt(code, 36), Number(width)] as const;
    })
  ));

/**
 * A bitmap font's character cell at magnification 1, in dots: from Zebra's
 * ZPL II Programming Guide (cell, gap, baseline) and Labelary (where H's
 * ink sits in the cell).
 */
type Cell = {
  width: number;
  height: number;
  gap: number;
  /** Rows from the top of the cell to the baseline */
  baseline: number;
  /** H's printed dots: first column, width, and first row */
  inkLeft: number;
  inkWidth: number;
  capTop: number;
  bold?: boolean;
  /** B has capitals only; H has capitals, digits and symbols only */
  letters?: "upper" | "no-lower";
};

const cells: Record<string, Cell> = {
  A: {
    width: 5,
    height: 9,
    gap: 1,
    baseline: 7,
    inkLeft: 0,
    inkWidth: 5,
    capTop: 0,
  },
  B: {
    width: 7,
    height: 11,
    gap: 2,
    baseline: 11,
    inkLeft: 0,
    inkWidth: 7,
    capTop: 0,
    bold: true,
    letters: "upper",
  },
  C: {
    width: 10,
    height: 18,
    gap: 2,
    baseline: 14,
    inkLeft: 0,
    inkWidth: 9,
    capTop: 0,
  },
  D: {
    width: 10,
    height: 18,
    gap: 2,
    baseline: 14,
    inkLeft: 0,
    inkWidth: 9,
    capTop: 0,
  },
  E: {
    width: 15,
    height: 28,
    gap: 5,
    baseline: 23,
    inkLeft: 1,
    inkWidth: 12,
    capTop: 3,
  },
  F: {
    width: 13,
    height: 26,
    gap: 3,
    baseline: 21,
    inkLeft: 0,
    inkWidth: 14,
    capTop: 0,
  },
  G: {
    width: 40,
    height: 60,
    gap: 8,
    baseline: 48,
    inkLeft: 4,
    inkWidth: 31,
    capTop: 0,
  },
  H: {
    width: 13,
    height: 21,
    gap: 6,
    baseline: 21,
    inkLeft: 0,
    inkWidth: 13,
    capTop: 0,
    letters: "no-lower",
  },
};

/** Fonts E and H have different cells on 6 and 12 dpmm printheads; scale them */
const cellFor = (name: string, dpmm: number): Cell | undefined => {
  const cell = cells[name];
  if (!cell || (name !== "E" && name !== "H") || dpmm === 8) return cell;

  const size: Record<string, Record<number, [number, number]>> = {
    E: { 6: [21, 10], 12: [42, 20], 24: [42, 20] },
    H: { 6: [17, 11], 12: [34, 22], 24: [34, 22] },
  };
  const [height, width] = size[name][dpmm] ?? [cell.height, cell.width];
  const sy = height / cell.height;
  const sx = width / cell.width;
  return {
    ...cell,
    width,
    height,
    gap: Math.round(cell.gap * sx),
    baseline: Math.round(cell.baseline * sy),
    inkLeft: Math.round(cell.inkLeft * sx),
    inkWidth: Math.round(cell.inkWidth * sx),
    capTop: Math.round(cell.capTop * sy),
  };
};

type TextOptions = {
  x: number;
  /** Top of the text, or the baseline when fromBottom is set */
  y: number;
  fromBottom: boolean;
  font: string;
  /** Height and width as given in ^A or ^CF; either may be missing */
  height?: number;
  width?: number;
  dpmm: number;
};

/** Draw a glyph scaled by (scaleX, scaleY) with its origin at (x, baseline) */
const drawGlyph = (
  raster: Raster,
  font: Font,
  glyph: number,
  x: number,
  baseline: number,
  scaleX: number,
  scaleY: number,
  color: Color
) => {
  const contours = flattenGlyph(font, glyph, 0.1 / scaleY).map((contour) =>
    contour.map(
      ([gx, gy]) => [x + gx * scaleX, baseline - gy * scaleY] as const
    )
  );
  if (contours.length) fillPath(raster, contours, color);
};

const drawFont0 = (
  raster: Raster,
  text: string,
  options: TextOptions,
  color: Color
) => {
  const font = load("0", font0Data);
  const advances = font0AdvanceTable();
  // A missing dimension takes the other's value
  const height = options.height ?? options.width ?? 9;
  const width = options.width ?? height;
  const scaleY = (CAP_HEIGHT * height) / font.capHeight;
  const baseline = options.fromBottom
    ? options.y
    : options.y + CAP_HEIGHT * height;
  let pen = options.x;

  for (const char of text) {
    const code = char.codePointAt(0)!;
    const advance = advances.get(code);
    if (advance === undefined) {
      pen += (MISSING_ADVANCE * width) / 100;
      continue;
    }
    const target = (advance * width) / 100;
    const glyph = font.glyphIndex(code);
    drawGlyph(
      raster,
      font,
      glyph,
      pen,
      baseline,
      target / font.advance(glyph),
      scaleY,
      color
    );
    pen += target;
  }
};

/** Whole-step magnification from 1 to 10 for a size in dots */
const magnification = (dots: number | undefined, base: number) =>
  dots === undefined
    ? undefined
    : Math.min(10, Math.max(1, Math.round(dots / base)));

const drawBitmapFont = (
  raster: Raster,
  text: string,
  cell: Cell,
  options: TextOptions,
  color: Color
) => {
  const font = cell.bold
    ? load("mono-bold", dejavuMonoBoldData)
    : load("mono", dejavuMonoData);

  // A missing dimension takes the other's magnification
  const givenY = magnification(options.height, cell.height);
  const givenX = magnification(options.width, cell.width);
  const magY = givenY ?? givenX ?? 1;
  const magX = givenX ?? givenY ?? 1;

  // Map the stand-in font's H onto where the printer's H sits in the cell
  const h = font.glyphIndex(0x48);
  const hPoints = font.outline(h).flat();
  const hLeft = Math.min(...hPoints.map((p) => p.x));
  const hRight = Math.max(...hPoints.map((p) => p.x));
  const scaleX = (cell.inkWidth * magX) / (hRight - hLeft);
  const scaleY = ((cell.baseline - cell.capTop) * magY) / font.capHeight;

  const top = options.fromBottom ? options.y - cell.baseline * magY : options.y;
  const baseline = top + cell.baseline * magY;
  const advance = (cell.width + cell.gap) * magX;
  let pen = options.x;

  for (let char of text) {
    if (cell.letters === "upper") char = char.toUpperCase();
    const blank = cell.letters === "no-lower" && char !== char.toUpperCase();
    if (!blank) {
      const glyph = font.glyphIndex(char.codePointAt(0)!);
      const x = pen + cell.inkLeft * magX - hLeft * scaleX;
      drawGlyph(raster, font, glyph, x, baseline, scaleX, scaleY, color);
    }
    pen += advance;
  }
};

/** Draw a line of text in one of the built-in fonts */
const drawText = (
  raster: Raster,
  text: string,
  options: TextOptions,
  color: Color
): void => {
  const cell = cellFor(options.font, options.dpmm);
  if (cell) drawBitmapFont(raster, text, cell, options, color);
  // Font 0 stands in for fonts we don't have yet
  else drawFont0(raster, text, options, color);
};

export { drawText };
