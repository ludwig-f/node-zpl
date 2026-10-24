// The tree-shakable encoders must give exactly what bwip-js's raw() does
import { test, expect } from "vitest";
import bwipjs from "bwip-js";
import { encodeLinear, encodeMatrix } from "./bwip.js";

const raw = (bcid: string, text: string, options: string) => {
  const [symbol] = bwipjs.raw(bcid, text, options);
  return symbol;
};

test.each([
  ["qrcode", "hello", "eclevel=Q"],
  ["qrcode", "hello world hello world", "eclevel=L"],
  ["qrcode", "https://github.com/ludwig-f/node-zpl", "eclevel=H"],
  ["datamatrix", "hello", ""],
  ["datamatrix", "hello", "columns=20 rows=20"],
  ["datamatrix", "https://github.com/ludwig-f/node-zpl", ""],
  ["pdf417", "hello", "eclevel=0 rowmult=1 columns=3"],
  ["pdf417", "hello", "eclevel=5 rowmult=1 columns=1"],
  ["pdf417", "hello", "eclevel=0 rowmult=1 columns=3 compact"],
  ["pdf417", "The quick brown fox 1234567890", "eclevel=2 rowmult=1"],
])("%s %j %s", (bcid, text, options) => {
  const expected = raw(bcid, text, options) as { pixs: number[]; pixx: number };
  expect(encodeMatrix(bcid, text, options)).toStrictEqual({
    modules: expected.pixs,
    columns: expected.pixx,
  });
});

test.each([
  ["code128", "12345678", ""],
  ["code128", "AB12cd", ""],
  ["code128", "^FNC1011234567890", "parsefnc"],
])("%s %j %s", (bcid, text, options) => {
  const expected = raw(bcid, text, options) as { sbs: number[] };
  expect(encodeLinear(bcid, text, options)).toStrictEqual(expected.sbs);
});
