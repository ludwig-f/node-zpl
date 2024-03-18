import { describe, expect, suite, test } from "vitest";
import PrinterSetup from "./PrinterSetup";
import ZplError from "./ZplError";

suite("PrinterManager", () => {
  describe("constructor", () => {
    test("should create a new printer setup with the given options", () => {
      const setup = new PrinterSetup();
      expect(setup).toBeDefined();
    });
  });

  describe("setDarkness", () => {
    test("should set the darkness of the printer", () => {
      const setup = new PrinterSetup().setDarkness(20);
      expect(setup.toZPL()).toStrictEqual("~SD20\n");
    });
  });

  describe("validate", () => {
    test("should throw ZPL error if darkness is not between 0 and 30", () => {
      const setup = new PrinterSetup();
      expect(() => setup.setDarkness(31)).toThrow(ZplError);
    });

    test("should throw ZPL error if name is not between 1 and 8 characters long", () => {
      const setup = new PrinterSetup();
      expect(() =>
        setup.storeGraphics("123456789", 0, 0, "", { device: "R" })
      ).toThrow(ZplError);
    });

    test("should throw if ZPL is empty", () => {
      const setup = new PrinterSetup();
      expect(() => setup.validate()).toThrow("ZPL content is empty");
    });
  });
});
