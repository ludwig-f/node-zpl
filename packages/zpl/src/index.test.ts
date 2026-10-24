import { suite, test, expect } from "vitest";
import * as core from "./index.js";
import * as image from "./image.js";
import * as jsx from "./jsx.js";
import * as jsxRuntime from "./jsx-runtime.js";
import * as jsxDevRuntime from "./jsx-dev-runtime.js";

suite("entry points", () => {
  test("the main entry exports the builder, units and serializer", () => {
    expect(Object.keys(core).sort()).toStrictEqual([
      "Label",
      "Orientation",
      "PrinterSetup",
      "ZebraFontFamily",
      "ZplError",
      "dots",
      "escapeFieldData",
      "lint",
      "mm",
      "parse",
      "serialize",
      "serializeCommand",
    ]);
  });

  test("the image converter has its own Node-only entry", () => {
    expect(Object.keys(image)).toStrictEqual(["ImageConverter"]);
  });

  test("the JSX entry exports the elements and build()", () => {
    expect(Object.keys(jsx).sort()).toStrictEqual([
      "Aztec",
      "Box",
      "Codabar",
      "Code11",
      "Code128",
      "Code39",
      "Code93",
      "DataMatrix",
      "DefaultFont",
      "EAN13",
      "EAN8",
      "Field",
      "FieldOrientation",
      "Fragment",
      "GS1DataBar",
      "Graphic",
      "IntelligentMail",
      "Interleaved2of5",
      "Label",
      "MaxiCode",
      "MicroPDF417",
      "Orientation",
      "PDF417",
      "Planet",
      "Postnet",
      "QrCode",
      "Raw",
      "StoredGraphic",
      "Text",
      "UpcA",
      "UpcE",
      "UpcEanExtension",
      "ZebraFontFamily",
      "build",
      "dots",
      "mm",
    ]);
  });

  test("the JSX runtimes export what compilers call", () => {
    expect(typeof jsxRuntime.jsx).toBe("function");
    expect(typeof jsxRuntime.jsxs).toBe("function");
    expect(typeof jsxRuntime.Fragment).toBe("function");
    expect(typeof jsxDevRuntime.jsxDEV).toBe("function");
    expect(jsxDevRuntime.Fragment).toBe(jsxRuntime.Fragment);
  });
});
