import { suite, describe, test, expect } from "vitest";
import { serialize, serializeCommand, escapeFieldData } from "./serialize.js";
import ZplError from "./ZplError.js";

suite("serialize", () => {
  describe("serializeCommand", () => {
    test.each([
      [{ type: "StartFormat" }, "^XA"],
      [{ type: "EndFormat" }, "^XZ"],
      [{ type: "PrintWidth", width: 684 }, "^PW684"],
      [{ type: "LabelLength", length: 228 }, "^LL228"],
      [{ type: "LabelHome", x: 5, y: 10 }, "^LH5,10"],
      [{ type: "LabelReverse", reverse: true }, "^LRY"],
      [{ type: "LabelReverse", reverse: false }, "^LRN"],
      [{ type: "ChangeEncoding", charset: 28 }, "^CI28"],
      [{ type: "DefaultFont", font: "0", height: 30, width: 20 }, "^CF0,30,20"],
      [{ type: "DefaultFont", font: "A" }, "^CFA"],
      [{ type: "FieldOrigin", x: 20, y: 30 }, "^FO20,30"],
      [{ type: "FieldOrigin", x: 20, y: 30, justification: 1 }, "^FO20,30,1"],
      [{ type: "FieldTypeset", x: 20, y: 30 }, "^FT20,30"],
      [{ type: "FieldTypeset" }, "^FT"],
      [
        { type: "Font", font: "0", orientation: "N", height: 30, width: 30 },
        "^A0N,30,30",
      ],
      [{ type: "Font", font: "0", height: 30 }, "^A0,30"],
      [{ type: "Font", font: "D" }, "^AD"],
      [
        { type: "FieldBlock", width: 400, maxLines: 3, justification: "C" },
        "^FB400,3,,C",
      ],
      [{ type: "FieldReverse" }, "^FR"],
      [{ type: "FieldHexIndicator" }, "^FH"],
      [{ type: "FieldHexIndicator", indicator: "#" }, "^FH#"],
      [{ type: "FieldData", data: "Hello, world" }, "^FDHello, world"],
      [{ type: "FieldSeparator" }, "^FS"],
      [{ type: "Comment", text: "a note" }, "^FXa note"],
      [
        {
          type: "GraphicBox",
          width: 100,
          height: 50,
          thickness: 3,
          color: "B",
          rounding: 0,
        },
        "^GB100,50,3,B,0",
      ],
      [{ type: "GraphicBox", width: 100, height: 50 }, "^GB100,50"],
      [{ type: "GraphicCircle", diameter: 80, thickness: 4 }, "^GC80,4"],
      [
        { type: "GraphicDiagonal", width: 80, height: 40, direction: "L" },
        "^GD80,40,,,L",
      ],
      [
        {
          type: "GraphicField",
          byteCount: 4,
          fieldCount: 4,
          bytesPerRow: 2,
          data: "FF00FF00",
        },
        "^GFA,4,4,2,FF00FF00",
      ],
      [
        {
          type: "RecallGraphic",
          device: "R",
          name: "LOGO",
          magnificationX: 2,
          magnificationY: 2,
        },
        "^XGR:LOGO.GRF,2,2",
      ],
      [{ type: "BarcodeDefaults", moduleWidth: 2, ratio: 2.5 }, "^BY2,2.5"],
      [
        {
          type: "Code11",
          orientation: "N",
          checkDigits: 1,
          height: 100,
          interpretationLine: true,
          interpretationLineAbove: false,
        },
        "^B1N,Y,100,Y,N",
      ],
      [{ type: "Code11", checkDigits: 2 }, "^B1,N"],
      [
        {
          type: "Code128",
          orientation: "N",
          height: 108,
          interpretationLine: true,
          interpretationLineAbove: false,
          uccCheckDigit: false,
          mode: "A",
        },
        "^BCN,108,Y,N,N,A",
      ],
      [{ type: "Code128" }, "^BC"],
      [{ type: "Ean13", orientation: "R", height: 50 }, "^BER,50"],
      [
        { type: "DataMatrix", orientation: "N", height: 9, quality: 200 },
        "^BXN,9,200",
      ],
      [{ type: "SetDarkness", darkness: 5 }, "~SD05"],
      [
        {
          type: "DownloadGraphic",
          device: "R",
          name: "LOGO",
          totalBytes: 4,
          bytesPerRow: 2,
          data: "FF00FF00",
        },
        "~DGR:LOGO.GRF,4,2,FF00FF00",
      ],
      [
        { type: "DeleteObject", device: "R", name: "LOGO", extension: "GRF" },
        "^IDR:LOGO.GRF",
      ],
      [{ type: "Raw", zpl: "^PQ2" }, "^PQ2"],
    ] as const)("%o -> %s", (command, expected) => {
      expect(serializeCommand(command)).toStrictEqual(expected);
    });

    test("throws when field data contains a command prefix", () => {
      expect(() =>
        serializeCommand({ type: "FieldData", data: "a^b" })
      ).toThrow(ZplError);
      expect(() =>
        serializeCommand({ type: "FieldData", data: "a~b" })
      ).toThrow(ZplError);
    });

    test("throws when a comment contains a command prefix", () => {
      expect(() => serializeCommand({ type: "Comment", text: "^XZ" })).toThrow(
        ZplError
      );
    });
  });

  describe("serialize", () => {
    test("joins commands without separators when minified", () => {
      expect(
        serialize([
          { type: "StartFormat" },
          { type: "FieldOrigin", x: 0, y: 0 },
          { type: "FieldSeparator" },
          { type: "EndFormat" },
        ])
      ).toStrictEqual("^XA^FO0,0^FS^XZ");
    });

    test("puts each command on its own line when not minified", () => {
      expect(
        serialize([{ type: "StartFormat" }, { type: "EndFormat" }], {
          minify: false,
        })
      ).toStrictEqual("^XA\n^XZ\n");
    });
  });

  describe("escapeFieldData", () => {
    test("leaves plain data untouched", () => {
      expect(escapeFieldData("Hello")).toStrictEqual({
        data: "Hello",
        needsHexIndicator: false,
      });
    });

    test("leaves underscores untouched when nothing needs escaping", () => {
      expect(escapeFieldData("a_b")).toStrictEqual({
        data: "a_b",
        needsHexIndicator: false,
      });
    });

    test("hex-escapes prefixes and the indicator itself", () => {
      expect(escapeFieldData("a^b~c_d")).toStrictEqual({
        data: "a_5Eb_7Ec_5Fd",
        needsHexIndicator: true,
      });
    });
  });
});
