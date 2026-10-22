/**
 * Drawing text in font 0. Letter shapes come from the embedded stand-in font
 * (Archivo), stretched to the advance widths measured from Labelary's font 0,
 * so text takes up the same room as on a printer.
 */
import { parseFont, flattenGlyph } from "./font.js";
import { font0Advances, font0Data } from "./fonts/font0.js";
import { fillPath } from "./raster.js";
import type { Font } from "./font.js";
import type { Color, Raster } from "./raster.js";

/** Font 0's capitals are three quarters of the character height */
const CAP_HEIGHT = 0.75;

/** What a character font 0 doesn't have advances, per 100 dots of width */
const MISSING_ADVANCE = 29.5;

let font0: { font: Font; advances: Map<number, number> } | undefined;

const loadFont0 = () => {
  if (!font0) {
    const binary = atob(font0Data);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const advances = new Map(
      font0Advances.split(",").map((pair) => {
        const [code, width] = pair.split(":");
        return [parseInt(code, 36), Number(width)] as const;
      })
    );
    font0 = { font: parseFont(bytes), advances };
  }
  return font0;
};

type TextOptions = {
  x: number;
  /** Top of the capitals, or the baseline when fromBottom is set */
  y: number;
  fromBottom: boolean;
  /** Character height and width in dots */
  height: number;
  width: number;
};

/** Draw a line of text in font 0 */
const drawText = (
  raster: Raster,
  text: string,
  options: TextOptions,
  color: Color
): void => {
  const { font, advances } = loadFont0();
  const { height, width } = options;
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
    const scaleX = target / font.advance(glyph);
    const contours = flattenGlyph(font, glyph, 0.1 / scaleY).map((contour) =>
      contour.map(
        ([gx, gy]) => [pen + gx * scaleX, baseline - gy * scaleY] as const
      )
    );
    if (contours.length) fillPath(raster, contours, color);
    pen += target;
  }
};

export { drawText };
