import { suite, describe, test, expect } from "vitest";
import { readFile } from "fs/promises";
import { join } from "path";
import ImageConverter, { ZplImage, zplMapCodes } from "./ImageConverter";

suite("ImageConverter", () => {
  const converter = new ImageConverter();

  describe("getEncodedString", () => {
    test("should return the encoded string for the given counter and character", () => {
      const counter = 3;
      const string = "A";
      // @ts-expect-error - testing a private method
      const encoded = converter.getEncodedString(3, string);
      expect(encoded).toStrictEqual(zplMapCodes[counter] + string);
    });
  });

  describe("encodeHexAscii", () => {
    test("should encode the given string to hex ascii", () => {
      // @ts-expect-error - testing a private method
      const encoded = converter.encodeHexAscii("test");
      expect(encoded).toStrictEqual("GtGeGsGt");
    });
  });

  describe("toZPL", () => {
    test("should convert the given image to ZPL", async () => {
      const imageBuffer = await readFile(
        join(import.meta.dirname, "../assets/test-image.png")
      );
      const result: ZplImage = await converter.toZPL(imageBuffer);

      expect(result.width).toStrictEqual(297);
      expect(result.height).toStrictEqual(228);
      expect(result.totalBytes).toStrictEqual(8664);
      expect(result.bytesPerRow).toStrictEqual(38);
      expect(typeof result.data).toStrictEqual("string");
      expect(result.data.length).toBeGreaterThan(0);
    });
  });
});
