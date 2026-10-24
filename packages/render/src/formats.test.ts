// Print orientation, ^FV, ^IL and stored formats, as measured on Labelary
// at 8 dpmm
import { describe, test, expect } from "vitest";
import { parse } from "node-zpl";
import { layout } from "./layout.js";
import { renderLabels } from "./render.js";

// 812 by 406 dots, the size of Labelary's 4 by 2 inch image, so labels
// turned upside down line up with it
const size = { widthMm: 101.5, heightMm: 50.75, dpmm: 8 };

type Box = { left: number; right: number; top: number; bottom: number };

const bounds = (zpl: string, label = 0): Box => {
  const raster = renderLabels(zpl, size)[label];
  const box = { left: Infinity, right: -1, top: Infinity, bottom: -1 };
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

const near = (actual: Box, [left, right, top, bottom]: number[], slack = 1) => {
  const expected = { left, right, top, bottom };
  for (const side of ["left", "right", "top", "bottom"] as const) {
    expect(
      Math.abs(actual[side] - expected[side]),
      `${side}: ${actual[side]} vs ${expected[side]}`
    ).toBeLessThanOrEqual(slack);
  }
};

test("^FV prints like ^FD", () => {
  expect(bounds("^XA^FO10,10^A0N,30^FVHello^FS^XZ")).toStrictEqual(
    bounds("^XA^FO10,10^A0N,30^FDHello^FS^XZ")
  );
});

describe("^PO", () => {
  test.each([
    // I turns the label upside down
    ["^XA^POI^FO10,10^GB50,20,20^FS^XZ", [752, 801, 376, 395]],
    // ...within the print width, which is then centered
    ["^XA^POI^PW400^FO10,10^GB50,20,20^FS^XZ", [546, 595, 376, 395]],
    ["^XA^PON^FO10,10^GB50,20,20^FS^XZ", [10, 59, 10, 29]],
  ])("%s", (zpl, expected) => {
    near(bounds(zpl), expected, 0);
  });
});

test("^IL draws a stored image at the label home", () => {
  near(
    bounds("~DGR:IMG.GRF,4,2,FFFFFFFF^XA^LH50,50^ILR:IMG.GRF^XZ"),
    [50, 65, 50, 51],
    0
  );
});

describe("stored formats", () => {
  const store = (body: string) => `^XA^DFR:T.ZPL^FS${body}^XZ`;

  test("aren't printed when stored", () => {
    expect(
      renderLabels(`${store("^FO20,30^A0N,30^FN1^FS")}^XA^XFR:T.ZPL^XZ`, size)
    ).toHaveLength(1);
  });

  test("fill every field with the number given", () => {
    near(
      bounds(
        `${store("^FO20,30^A0N,30^FN1^FS^FO20,80^A0N,30^FN1^FS")}` +
          "^XA^XFR:T.ZPL^FN1^FDTwice^FS^XZ"
      ),
      [21, 88, 30, 101]
    );
  });

  test("keep a field's own data when the recall gives none", () => {
    near(
      bounds(`${store("^FO20,30^A0N,30^FN1^FDdefault^FS")}^XA^XFR:T.ZPL^XZ`),
      [21, 101, 29, 51]
    );
  });

  test("replace a field's own data with the recall's", () => {
    expect(
      bounds(
        `${store("^FO20,30^A0N,30^FN1^FDdefault^FS")}` +
          "^XA^XFR:T.ZPL^FN1^FDHello^FS^XZ"
      )
    ).toStrictEqual(bounds("^XA^FO20,30^A0N,30^FDHello^FS^XZ"));
  });

  test("draw the recall's other fields too", () => {
    expect(
      bounds(
        `${store("^FO20,30^A0N,30^FN1^FS")}` +
          "^XA^XFR:T.ZPL^FN1^FDHello^FS^FO20,80^GB40,40,40^FS^XZ"
      )
    ).toStrictEqual(
      bounds("^XA^FO20,30^A0N,30^FDHello^FS^FO20,80^GB40,40,40^FS^XZ")
    );
  });

  test("trace filled fields back to the recall's data", () => {
    const commands = parse(
      `${store("^FO20,30^A0N,30^FN1^FS")}^XA^XFR:T.ZPL^FN1^FDHello^FS^XZ`
    ).commands;
    const [label] = layout(commands);
    const data = commands.findIndex(
      (command) => command.type === "FieldData" && command.data === "Hello"
    );
    expect(label.elements[0].commands).toContain(data);
  });
});
