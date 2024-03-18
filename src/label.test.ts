import { suite, describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import Label from "./Label";
import ZplError from "./ZplError";
import ImageConverter from "./ImageConverter";
import { Orientation, ZebraFontFamily } from "./types";

suite("Label", () => {
  const basicTestLabelHeader = "^XA^PW120^LL120^LRN^CI28^LH0,0";

  describe("constructor", () => {
    test("should create a label with the given width, length and gap", () => {
      const label = new Label(10, 10, 12);
      expect(label.toZPL()).toStrictEqual(basicTestLabelHeader + "^XZ");
    });
  });

  describe("validate", () => {
    test("should throw ZPL error if label is not closed", () => {
      const label = new Label(10, 10, 12);
      expect(() => label.validate()).toThrow(ZplError);
    });

    test("should throw ZPL error if line does not start with ^ or ~", () => {
      const label = new Label(10, 10, 12).raw("Test");
      expect(() => label.validate()).toThrow(ZplError);
    });

    test("should throw ZPL error if generated ZPL does not have the same amount of field open and close", () => {
      const label = new Label(10, 10, 12).startField(0, 0);
      expect(() => label.validate()).toThrow(ZplError);
    });

    test("should throw ZPL error if using an unknown command in strict mode", () => {
      const label = new Label(10, 10, 12).open().raw("^ZZ");
      expect(() => label.validate()).toThrow(ZplError);
    });
  });

  describe("setCharacterSet", () => {
    test("should set the character set of the label", () => {
      const label = new Label(10, 10, 12, { characterSet: "26" });
      expect(label.toZPL()).toStrictEqual(
        basicTestLabelHeader.replace(`^CI28`, "^CI26") + "^XZ"
      );
    });
  });

  describe("setHome", () => {
    test("should set the home position of the label", () => {
      const label = new Label(10, 10, 12, { home: { x: 5, y: 5 } });
      expect(label.toZPL()).toStrictEqual(
        basicTestLabelHeader.replace("^LH0,0", "^LH5,5") + "^XZ"
      );
    });
  });

  describe("setDefaultFont", () => {
    test("should set the default font of the label", () => {
      const label = new Label(10, 10, 12).setDefaultFont(
        20,
        20,
        ZebraFontFamily.C
      );
      expect(label.toZPL()).toStrictEqual(
        basicTestLabelHeader + "^CFC,20,20^XZ"
      );
    });
  });

  describe("setLabelReverse", () => {
    test("should set the label reverse", () => {
      const label = new Label(10, 10, 12, { reverse: true });
      expect(label.toZPL()).toStrictEqual(
        basicTestLabelHeader.replace("^LRN", "^LRY") +
          "^FO0,0^GB120,120,120,B,0^FS^XZ"
      );
    });
  });

  describe("drawEAN13", () => {
    test("should draw an EAN13 barcode on the label", () => {
      const label = new Label(57, 19, 12).drawEAN13({
        position: { x: 20, y: 20 },
        height: 9,
        data: "123456789012",
        printHri: true,
        printHriAbove: false,
        orientation: Orientation.Normal,
      });

      const expectedZPL =
        basicTestLabelHeader.replace("^PW120^LL120", "^PW684^LL228") +
        `^FO20,20^BEN,108,Y,N^FD123456789012^FS^XZ`;

      expect(label.toZPL()).toStrictEqual(expectedZPL);
    });
  });

  describe("drawCode11", () => {
    test("should draw a Code 11 barcode on the label", () => {
      const label = new Label(57, 19, 12).drawCode11({
        position: { x: 20, y: 20 },
        data: "1234567890",
        charHeight: 9,
        checkDigits: 1,
        orientation: Orientation.Normal,
        printHri: true,
        printHriAbove: false,
      });

      const expectedZpl =
        basicTestLabelHeader.replace("^PW120^LL120", "^PW684^LL228") +
        "^FO20,20^B1N,Y,108,Y,N^FD1234567890^FS^XZ";

      expect(label.toZPL()).toStrictEqual(expectedZpl);
    });
  });

  describe("drawCode128", () => {
    test("should draw a Code 128 barcode on the label", () => {
      const label = new Label(57, 19, 12).drawCode128({
        position: { x: 20, y: 20 },
        data: "1234567890",
        charHeight: 9,
        orientation: Orientation.Normal,
        printHri: true,
        printHriAbove: false,
        useUcc: false,
        mode: "N",
      });

      const expectedZpl =
        basicTestLabelHeader.replace("^PW120^LL120", "^PW684^LL228") +
        "^FO20,20^BCN,108,Y,N,N,N^FD1234567890^FS^XZ";

      expect(label.toZPL()).toStrictEqual(expectedZpl);
    });
  });

  describe("drawDataMatrixCode", () => {
    test("should draw a DataMatrix code on the label", () => {
      const label = new Label(57, 19, 12).drawDataMatrix({
        position: { x: 20, y: 20 },
        height: 9,
        data: "1234567890",
      });

      expect(label.toZPL()).toStrictEqual(
        basicTestLabelHeader.replace("^PW120^LL120", "^PW684^LL228") +
          `^FO20,20^BXN,9,200^FD1234567890^FS^XZ`
      );
    });
  });

  describe("drawGraphic", () => {
    test("should draw a graphic on the label", async () => {
      const converter = new ImageConverter();
      const buffer = readFileSync(join(__dirname, "../assets/test-image.png"));
      const image = await converter.toZPL(buffer);

      const label = new Label(57, 19, 12).drawImage({
        position: { x: 20, y: 20 },
        totalBytes: image.totalBytes,
        bytesPerRow: image.bytesPerRow,
        data: image.data,
      });
      const zpl = label.toZPL();

      expect(zpl).toBeTypeOf("string");
      expect(zpl.length).toBeGreaterThan(0);
    });
  });
});
