import { suite, test, expect, beforeEach } from "vitest";
import { configure } from "./index.js";
import type { RenderOptions } from "./index.js";

type Call = {
  zpl: string;
  options: RenderOptions;
  resolve: (images: string[]) => void;
};

// A renderer the tests control: each call waits until the test resolves it
const calls: Call[] = [];
configure({
  render: (zpl, options) =>
    new Promise((resolve) => calls.push({ zpl, options, resolve })),
});

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const create = () => {
  const element = document.createElement("zpl-preview");
  document.body.append(element);
  return element;
};

const shownImages = (element: HTMLElement) =>
  [...element.shadowRoot!.querySelectorAll("img")].map((image) => image.src);

suite("configure({ render })", () => {
  beforeEach(() => {
    calls.length = 0;
    document.body.replaceChildren();
  });

  test("renders once for several changes in a row", async () => {
    const element = create();
    element.dpmm = 12;
    element.zpl = "^XA^PW120^LL100^XZ";
    element.zpl = "^XA^PW240^LL100^XZ";
    await tick();

    expect(calls.map((call) => call.zpl)).toStrictEqual(["^XA^PW240^LL100^XZ"]);
  });

  test("passes the label size, resolution and grayscale setting", async () => {
    const element = create();
    element.setAttribute("grayscale", "");
    element.dpmm = 12;
    element.zpl = "^XA^PW240^LL120^XZ";
    await tick();

    expect(calls[0].options).toStrictEqual({
      widthMm: 20,
      heightMm: 10,
      dpmm: 12,
      grayscale: true,
    });
  });

  test("ignores a result that arrives after a newer render started", async () => {
    const element = create();
    element.zpl = "^XA^FDold^FS^XZ";
    await tick();
    element.zpl = "^XA^FDnew^FS^XZ";
    await tick();

    const [old, current] = calls;
    current.resolve(["bmV3"]);
    await tick();
    old.resolve(["b2xk"]);
    await tick();

    expect(shownImages(element)).toStrictEqual(["data:image/png;base64,bmV3"]);
  });

  test("can't set wasmUrl once a renderer is in use", () => {
    expect(() => configure({ wasmUrl: "/zebrash.wasm" })).toThrow();
  });
});
