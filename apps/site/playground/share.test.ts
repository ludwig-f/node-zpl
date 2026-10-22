import { test, expect } from "vitest";
import { decodeShare, encodeShare } from "./share";

const state = {
  zpl: "^XA^FO50,50^A0,40^FDHello, wörld ^ _ ~^FS^XZ",
  widthMm: 50.8,
  heightMm: undefined,
  dpmm: 12,
  smoothing: 0.4,
};

test("a shared link decodes to the same label and settings", async () => {
  expect(await decodeShare(await encodeShare(state))).toStrictEqual(state);
});

test("links only use characters that are safe in a URL", async () => {
  expect(await encodeShare(state)).toMatch(/^[A-Za-z0-9_-]+$/);
});

test("links are shorter than the ZPL for typical labels", async () => {
  const zpl = "^XA" + "^FO50,50^A0,40^FDHello^FS".repeat(20) + "^XZ";
  const link = await encodeShare({ ...state, zpl });
  expect(link.length).toBeLessThan(zpl.length / 2);
});

test("anything that isn't a link decodes to undefined", async () => {
  expect(await decodeShare("not-a-share-link")).toBeUndefined();
  expect(await decodeShare("")).toBeUndefined();
});
