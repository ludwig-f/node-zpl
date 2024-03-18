type StoreGraphicsOptions = {
  device: "R" | "E" | "B" | "A";
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
  x: number;
  y: number;
};

export type { StoreGraphicsOptions, Position };
export { ZebraFontFamily, Orientation };
