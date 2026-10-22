import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseFont, flattenGlyph } from "./font.js";

const font = parseFont(
  new Uint8Array(
    readFileSync(
      new URL("./__fixtures__/RobotoCondensed-Bold.ttf", import.meta.url)
    )
  )
);

/** Bounds of a glyph's flattened outline, in font units */
const bounds = (char: string) => {
  const contours = flattenGlyph(
    font,
    font.glyphIndex(char.codePointAt(0)!),
    0.5
  );
  const points = contours.flat();
  return {
    contours: contours.length,
    bounds: [
      Math.round(Math.min(...points.map((p) => p[0]))),
      Math.round(Math.min(...points.map((p) => p[1]))),
      Math.round(Math.max(...points.map((p) => p[0]))),
      Math.round(Math.max(...points.map((p) => p[1]))),
    ],
  };
};

// Expected values come from fontTools
describe("parseFont", () => {
  test("reads the font's metrics", () => {
    expect([font.unitsPerEm, font.capHeight, font.numGlyphs]).toStrictEqual([
      2048, 1456, 1321,
    ]);
  });

  test("maps characters to glyphs", () => {
    expect(font.glyphIndex("H".codePointAt(0)!)).toBe(44);
    expect(font.glyphIndex("Å".codePointAt(0)!)).toBe(671);
    expect(font.glyphIndex(0x10ffff)).toBe(0);
  });

  test("reads advance widths", () => {
    expect(font.advance(44)).toBe(1257);
    expect(font.advance(83)).toBe(1019);
  });
});

describe("flattenGlyph", () => {
  test("outlines a simple glyph", () => {
    expect(bounds("H")).toStrictEqual({
      contours: 3,
      bounds: [118, 0, 1137, 1456],
    });
  });

  test("flattens curves to within the tolerance", () => {
    const { bounds: b } = bounds("o");
    const expected = [72, -20, 947, 1102];
    b.forEach((value, i) =>
      expect(Math.abs(value - expected[i])).toBeLessThanOrEqual(1)
    );
  });

  test("assembles composite glyphs from their parts", () => {
    expect(bounds("Å").bounds).toStrictEqual([23, 0, 1203, 1935]);
    const accented = bounds("é");
    expect(accented.bounds[3]).toBeGreaterThan(1500);
  });

  test("glyphs without an outline have no contours", () => {
    expect(flattenGlyph(font, font.glyphIndex(32), 0.5)).toStrictEqual([]);
  });
});
