import { suite, test, expect } from "vitest";
import { dots, mm, toDots } from "./units.js";

suite("units", () => {
  test("dots are passed through unchanged", () => {
    expect(toDots(dots(80), 12)).toStrictEqual(80);
  });

  test("millimeters are converted using the dots per millimeter", () => {
    expect(toDots(mm(10), 8)).toStrictEqual(80);
  });

  test("millimeters are rounded to whole dots", () => {
    expect(toDots(mm(1.3), 8)).toStrictEqual(10);
  });

  test("dots must be whole numbers", () => {
    expect(() => dots(1.5)).toThrow();
  });

  test("lengths cannot be negative", () => {
    expect(() => mm(-1)).toThrow();
    expect(() => dots(-1)).toThrow();
  });
});
