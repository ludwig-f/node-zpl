// Expectations come from Labelary renders of fonts A to H at 8 dpmm
import { describe, test, expect } from "vitest";
import { renderLabels } from "./render.js";

const size = { widthMm: 101.6, heightMm: 101.6, dpmm: 8 };

/** Bounds of the printed dots, relative to (100, 100) */
const ink = (body: string) => {
  const [raster] = renderLabels(`^XA^PW812${body}^XZ`, size);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < raster.height; y++) {
    for (let x = 0; x < raster.width; x++) {
      if (raster.ink[y * raster.width + x] < 0.5) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  return {
    x: [minX - 100, maxX - 100],
    y: [minY - 100, maxY - 100],
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
};

/** How far each character moves the next one along */
const advance = (font: string) =>
  (ink(`^FO100,100${font}^FDHHHHHHHHHH^FS`).width -
    ink(`^FO100,100${font}^FDH^FS`).width) /
  9;

describe("bitmap fonts", () => {
  test.each([
    // font, advance, H spans x, H spans y
    ["A", 6, [0, 4], [0, 6]],
    ["B", 9, [0, 6], [0, 10]],
    ["C", 12, [0, 8], [0, 13]],
    ["D", 12, [0, 8], [0, 13]],
    ["E", 20, [1, 12], [3, 22]],
    ["F", 16, [0, 13], [0, 20]],
    ["G", 48, [4, 34], [0, 47]],
    ["H", 19, [0, 12], [0, 20]],
  ])("font %s advances %d dots and fits its cell", (font, adv, x, y) => {
    expect(advance(`^A${font}N`)).toBe(adv);
    expect(ink(`^FO100,100^A${font}N^FDH^FS`)).toMatchObject({ x, y });
  });

  test("^FT puts the baseline at the given y", () => {
    expect(ink("^FT100,300^ADN^FDH^FS").y[1]).toBe(199);
  });

  describe("magnification", () => {
    test.each([
      // ^A size, advance, H height
      ["^ADN,18,10", 12, 14],
      ["^ADN,27,15", 24, 28],
      ["^ADN,30,10", 12, 28],
      ["^ADN,40,25", 36, 28],
      ["^ADN,54,10", 12, 42],
      ["^ADN,36", 24, 28],
      ["^ADN,,20", 24, 28],
      ["^ADN,18,0", 12, 14],
      ["^ADN,0,0", 12, 14],
    ])("%s advances %d dots with %d-dot capitals", (font, adv, height) => {
      expect(advance(font)).toBe(adv);
      expect(ink(`^FO100,100${font}^FDH^FS`).height).toBe(height);
    });

    test("^CF magnifies the default font the same way", () => {
      expect(advance("^CFA,30")).toBe(18);
      expect(ink("^CFA,30^FO100,100^FDH^FS").height).toBe(21);
    });
  });

  test("font B prints lowercase letters as capitals", () => {
    expect(ink("^FO100,100^ABN^FDhello^FS")).toStrictEqual(
      ink("^FO100,100^ABN^FDHELLO^FS")
    );
  });

  test("font H leaves lowercase letters blank but keeps their space", () => {
    expect(ink("^FO100,100^AHN^FDHxxH^FS").width).toBe(3 * 19 + 13);
  });

  test("the default font is A at power-up", () => {
    expect(ink("^FO100,100^FDH^FS")).toMatchObject({ x: [0, 4], y: [0, 6] });
  });
});
