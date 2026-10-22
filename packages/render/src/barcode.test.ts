// Barcode placement, as measured on Labelary at 8 dpmm
import { describe, test, expect } from "vitest";
import { renderLabels } from "./render.js";

const size = { widthMm: 101.6, heightMm: 101.6, dpmm: 8 };
const render = (body: string) => renderLabels(`^XA${body}^XZ`, size)[0];

type Box = { left: number; right: number; top: number; bottom: number };

/**
 * Bounds of the bars and of the interpretation line of a horizontal barcode,
 * telling them apart by how many bars a row crosses
 */
const parts = (body: string) => {
  const raster = render(body);
  const bars: number[] = [];
  const text: number[] = [];
  const box = (rows: number[]): Box | undefined => {
    if (!rows.length) return undefined;
    let left = Infinity;
    let right = -Infinity;
    for (const y of rows) {
      for (let x = 0; x < raster.width; x++) {
        if (raster.ink[y * raster.width + x] < 0.5) continue;
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
    }
    return { left, right, top: rows[0], bottom: rows[rows.length - 1] };
  };
  for (let y = 0; y < raster.height; y++) {
    let runs = 0;
    let previous = false;
    for (let x = 0; x < raster.width; x++) {
      const dot = raster.ink[y * raster.width + x] >= 0.5;
      if (dot && !previous) runs++;
      previous = dot;
    }
    if (runs >= 15) bars.push(y);
    else if (runs > 0) text.push(y);
  }
  return { bars: box(bars), text: box(text) };
};

/** Bounds of everything printed */
const bounds = (body: string): Box => {
  const raster = render(body);
  const box = { left: Infinity, right: -Infinity, top: Infinity, bottom: -1 };
  for (let y = 0; y < raster.height; y++) {
    for (let x = 0; x < raster.width; x++) {
      if (raster.ink[y * raster.width + x] < 0.5) continue;
      box.left = Math.min(box.left, x);
      box.right = Math.max(box.right, x);
      box.top = Math.min(box.top, y);
      box.bottom = Math.max(box.bottom, y);
    }
  }
  return box;
};

const near = (actual: Box | undefined, expected: Box, slack = 1) => {
  expect(actual).toBeDefined();
  for (const side of ["left", "right", "top", "bottom"] as const) {
    expect(
      Math.abs(actual![side] - expected[side]),
      `${side}: ${actual![side]} vs ${expected[side]}`
    ).toBeLessThanOrEqual(slack);
  }
};

describe("Code 128", () => {
  test("draws the bars dot for dot", () => {
    const raster = render("^FO100,100^BY1^BCN,50,N^FD12345678^FS");
    const runs: number[] = [];
    let previous = true;
    for (let x = 100; x <= 222; x++) {
      const dot = raster.ink[110 * raster.width + x] >= 0.5;
      if (dot === previous && runs.length) runs[runs.length - 1]++;
      else runs.push(1);
      previous = dot;
    }
    expect(runs.join(",")).toBe(
      "2,1,1,2,1,4,1,2,3,2,2,1,2,2,3,2,1,1,2,2,1,1,3,2,2,2,1,2,3,1,2,1,3,2,1,2,2,2,3,1,1,2,3,1,2,1,3,1,3,1,1,2,2,2,3,1,4,1,1,1,2,3,3,1,1,1,2"
    );
    expect(bounds("^FO100,100^BY1^BCN,50,N^FD12345678^FS")).toStrictEqual({
      left: 100,
      right: 222,
      top: 100,
      bottom: 149,
    });
  });

  test.each([
    // ^BY sets the module width and, unless ^BC gives one, the height
    ["^FO100,100^BY2^BCN,100,Y,N^FD12345678^FS", 100, 345, 100, 199],
    ["^FO100,100^BC^FD12345678^FS", 100, 345, 100, 109],
    ["^FO100,100^BY3^BC^FD12345678^FS", 100, 468, 100, 109],
    ["^FO100,100^BY3,2,50^BC^FD12345678^FS", 100, 468, 100, 149],
    // ^FT places the bottom of the bars
    ["^FT100,300^BY2^BCN,100,Y,N^FD12345678^FS", 100, 345, 200, 299],
  ])("%s", (body, left, right, top, bottom) => {
    expect(parts(body).bars).toStrictEqual({ left, right, top, bottom });
  });

  describe("interpretation line", () => {
    test.each([
      // Font D scaled by half the module width, 6 dots below the bars
      ["^FO100,100^BY2^BCN,100,Y,N^FD12345678^FS", 176, 267, 206, 219],
      ["^FO100,100^BY1^BCN,100,Y,N^FDHHHH^FS", 128, 149, 206, 212],
      ["^FO100,100^BY3^BCN,100,Y,N^FDHHHH^FS", 184, 249, 206, 226],
      ["^FO100,100^BY5^BCN,100,Y,N^FDHHHH^FS", 239, 350, 206, 240],
      ["^FT100,300^BY2^BCN,100,Y,N^FD12345678^FS", 176, 267, 306, 319],
      // ...or above, its cell 8 dots clear of the bars
      ["^FO100,200^BY1^BCN,100,Y,Y^FD12345678^FS", 139, 183, 183, 189],
      ["^FO100,200^BY2^BCN,100,Y,Y^FD12345678^FS", 176, 267, 174, 187],
      ["^FO100,200^BY4^BCN,100,Y,Y^FD12345678^FS", 252, 436, 156, 184],
    ])("%s", (body, left, right, top, bottom) => {
      near(parts(body).text, { left, right, top, bottom });
    });

    test("is left out with N", () => {
      expect(parts("^FO100,100^BY2^BCN,100,N^FD12345678^FS").text).toBe(
        undefined
      );
    });
  });

  describe("rotation", () => {
    test.each([
      ["^FT300,300^BY2^BCR,100,N^FD1234^FS", 300, 399, 300, 457],
      ["^FT300,300^BY2^BCI,100,N^FD1234^FS", 142, 299, 300, 399],
      ["^FT300,300^BY2^BCB,100,N^FD1234^FS", 200, 299, 142, 299],
      ["^FO300,300^BY2^BCR,100,N^FD1234^FS", 300, 399, 300, 457],
      ["^FO300,300^BY2^BCI,100,N^FD1234^FS", 300, 457, 300, 399],
      ["^FO300,300^BY2^BCB,100,N^FD1234^FS", 300, 399, 300, 457],
      ["^FWR^FO300,300^BY2^BC,100,N^FD1234^FS", 300, 399, 300, 457],
    ])("%s", (body, left, right, top, bottom) => {
      expect(bounds(body)).toStrictEqual({ left, right, top, bottom });
    });

    test("keeps the interpretation line below the bars", () => {
      // Labelary: turned clockwise, the line is left of the bars
      near(
        bounds("^FO100,100^BY2^BCR,100,Y,N^FD12345678^FS"),
        { left: 80, right: 199, top: 100, bottom: 345 },
        1
      );
      // ...and upside down, above them
      near(
        bounds("^FO100,100^BY2^BCI,100,Y,N^FD12345678^FS"),
        { left: 100, right: 345, top: 80, bottom: 199 },
        1
      );
    });
  });
});
