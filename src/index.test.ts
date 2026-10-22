import { suite, test, expect } from "vitest";
import * as core from "./index.js";
import * as image from "./image.js";

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
      "mm",
      "serialize",
      "serializeCommand",
    ]);
  });

  test("the image converter has its own Node-only entry", () => {
    expect(Object.keys(image)).toStrictEqual(["ImageConverter"]);
  });
});
