// Expectations come from reference renders of font 0 at 8 dpmm
import { describe, test, expect } from "vitest";
import { renderLabels } from "./render.js";
import { layout } from "./layout.js";
import { parse } from "@zplkit/core";

const size = { widthMm: 101.6, heightMm: 101.6, dpmm: 8 };
const render = (body: string) =>
  renderLabels(`^XA^CI28^PW812${body}^XZ`, size)[0];

/** Bounds of the printed dots */
const inkBounds = (body: string) => {
  const raster = render(body);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -1;
  let maxY = -1;
  let count = 0;
  for (let y = 0; y < raster.height; y++) {
    for (let x = 0; x < raster.width; x++) {
      if (raster.ink[y * raster.width + x] < 0.5) continue;
      count++;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  return { x: [minX, maxX], y: [minY, maxY], width: maxX - minX + 1, count };
};

describe("font 0", () => {
  test("capitals are three quarters of the height, from the top of ^FO", () => {
    expect(inkBounds("^FO100,100^A0N,100,100^FDH^FS").y).toStrictEqual([
      100, 174,
    ]);
  });

  test("^FT puts the baseline at the given y", () => {
    expect(inkBounds("^FT100,300^A0N,100,100^FDH^FS").y).toStrictEqual([
      225, 299,
    ]);
  });

  test("letters advance as far as on a printer", () => {
    // Reference: H advances 60.9 dots at ^A0N,100,100
    const one = inkBounds("^FO100,100^A0N,100,100^FDH^FS").width;
    const ten = inkBounds("^FO100,100^A0N,100,100^FDHHHHHHHHHH^FS").width;
    expect(Math.abs(ten - one - 9 * 60.9)).toBeLessThanOrEqual(1);
  });

  test("the width parameter scales horizontally only", () => {
    const one = inkBounds("^FO100,100^A0N,100,50^FDH^FS");
    const ten = inkBounds("^FO100,100^A0N,100,50^FDHHHHHHHHHH^FS");
    expect(Math.abs(ten.width - one.width - 9 * 30.45)).toBeLessThanOrEqual(1);
    expect(ten.y).toStrictEqual([100, 174]);
  });

  test("without a width, the width equals the height", () => {
    expect(inkBounds("^FO100,100^A0N,100^FDHHH^FS")).toStrictEqual(
      inkBounds("^FO100,100^A0N,100,100^FDHHH^FS")
    );
  });

  test("^CF sets the font for fields without ^A", () => {
    expect(inkBounds("^CF0,50^FO100,100^FDHH^FS")).toStrictEqual(
      inkBounds("^FO100,100^A0N,50,50^FDHH^FS")
    );
  });

  test("characters font 0 doesn't have advance like a space", () => {
    // Reference: a missing glyph prints nothing and advances 29.5
    const single = inkBounds("^FO100,100^A0N,100,100^FDH^FS").width;
    const spaced = inkBounds("^FO100,100^A0N,100,100^FDHĀH^FS").width;
    expect(Math.abs(spaced - single - (60.9 + 29.5))).toBeLessThanOrEqual(1);
  });

  test("decodes ^FH hex escapes", () => {
    expect(render("^FO100,100^A0N,60^FH^FD_48i_5F^FS").ink).toStrictEqual(
      render("^FO100,100^A0N,60^FDHi^FS^FO100,100^A0N,60^FH^FD_48i_5F^FS").ink
    );
  });

  test("decodes UTF-8 text", () => {
    // Å reaches above the capital height
    expect(inkBounds("^FO100,100^A0N,100^FDÅ^FS").y[0]).toBeLessThan(100);
  });

  test("^FR prints white text on black", () => {
    const raster = render(
      "^FO100,100^GB300,100,100^FS^FO110,110^FR^A0N,80^FDHi^FS"
    );
    const white = Array.from(
      raster.ink.subarray(130 * 812 + 100, 130 * 812 + 400)
    ).filter((ink) => ink < 0.5).length;
    expect(white).toBeGreaterThan(10);
  });
});

describe("text layout", () => {
  test("text elements remember the commands of their field", () => {
    const { commands } = parse("^XA^FO10,10^A0N,30^FDHi^FS^XZ");
    const [element] = layout(commands)[0].elements;
    expect(element).toMatchObject({
      kind: "text",
      text: "Hi",
      commands: [1, 2, 3, 4],
    });
  });
});
