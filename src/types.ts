import type { Length } from "./units.js";

/**
 * A 1-bit image as ASCII hex, e.g. the result of ImageConverter.toZPL
 */
type Graphic = {
  totalBytes: number;
  bytesPerRow: number;
  data: string;
};

enum ZebraFontFamily {
  A = "A",
  B = "B",
  C = "C",
  D = "D",
  E = "E",
  F = "F",
  G = "G",
  H = "H",
  P = "P",
  Q = "Q",
  R = "R",
  S = "S",
  T = "T",
  U = "U",
  V = "V",
  ZERO = "0",
}

enum Orientation {
  Normal = "N",
  Rotated90Degrees = "R",
  Inverted180Degrees = "I",
  BottomUp270Degrees = "B",
}

type Position = {
  x: Length;
  y: Length;
};

export type { Graphic, Position };
export { ZebraFontFamily, Orientation };
