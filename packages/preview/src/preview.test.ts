import { suite, describe, test, expect, beforeEach } from "vitest";
import { ZplPreview } from "./index.js";

/** Width and height of a PNG from a data URL, read from its IHDR chunk */
const pngSize = (dataUrl: string) => {
  const bytes = Buffer.from(
    dataUrl.replace(/^data:image\/png;base64,/, ""),
    "base64"
  );
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
};

const nextRender = (element: HTMLElement) =>
  new Promise<CustomEvent>((resolve, reject) => {
    element.addEventListener("zpl-render", (e) => resolve(e as CustomEvent), {
      once: true,
    });
    element.addEventListener("zpl-error", (e) =>
      reject((e as CustomEvent).detail.error)
    );
  });

const nextError = (element: HTMLElement) =>
  new Promise<CustomEvent>((resolve) =>
    element.addEventListener("zpl-error", (e) => resolve(e as CustomEvent), {
      once: true,
    })
  );

const images = (element: HTMLElement) =>
  [...element.shadowRoot!.querySelectorAll("img")] as HTMLImageElement[];

const create = () => {
  const element = document.createElement("zpl-preview") as ZplPreview;
  document.body.append(element);
  return element;
};

suite("<zpl-preview>", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  test("is registered as a custom element", () => {
    expect(customElements.get("zpl-preview")).toBe(ZplPreview);
  });

  describe("rendering", () => {
    test("renders the zpl attribute as a PNG image", async () => {
      const element = create();
      const rendered = nextRender(element);
      element.setAttribute("zpl", "^XA^PW400^LL200^FO20,20^A0,40^FDHi^FS^XZ");

      const event = await rendered;
      const [image] = images(element);

      expect(image.src).toMatch(/^data:image\/png;base64,/);
      expect(event.detail.images).toStrictEqual([image.src]);
    });

    test("sizes the image from ^PW, ^LL and dpmm", async () => {
      const element = create();
      const rendered = nextRender(element);
      element.setAttribute("dpmm", "8");
      element.setAttribute("zpl", "^XA^PW400^LL200^FO20,20^A0,40^FDHi^FS^XZ");
      await rendered;

      expect(pngSize(images(element)[0].src)).toStrictEqual({
        width: 400,
        height: 200,
      });
    });

    test("width and height attributes in millimeters override ^PW and ^LL", async () => {
      const element = create();
      const rendered = nextRender(element);
      element.setAttribute("width", "25");
      element.setAttribute("height", "10");
      element.setAttribute("dpmm", "12");
      element.zpl = "^XA^PW400^LL200^FO20,20^A0,40^FDHi^FS^XZ";
      await rendered;

      expect(pngSize(images(element)[0].src)).toStrictEqual({
        width: 300,
        height: 120,
      });
    });

    test("accepts anything with toZPL(), like a node-zpl Label", async () => {
      const element = create();
      const rendered = nextRender(element);
      element.zpl = { toZPL: () => "^XA^PW100^LL100^FO0,0^GB50,50,50^FS^XZ" };
      await rendered;

      expect(pngSize(images(element)[0].src)).toStrictEqual({
        width: 100,
        height: 100,
      });
    });

    test("renders one image per label", async () => {
      const element = create();
      const rendered = nextRender(element);
      element.zpl =
        "^XA^PW100^LL100^FO0,0^FDOne^FS^XZ^XA^PW100^LL100^FO0,0^FDTwo^FS^XZ";
      await rendered;

      expect(images(element).map((image) => image.alt)).toStrictEqual([
        "Label 1 of 2",
        "Label 2 of 2",
      ]);
    });

    test("shows the latest ZPL after several changes in a row", async () => {
      const element = create();
      let renders = 0;
      element.addEventListener("zpl-render", () => renders++);
      const rendered = nextRender(element);

      element.setAttribute("dpmm", "8");
      element.zpl = "^XA^PW100^LL100^FDfirst^FS^XZ";
      element.zpl = "^XA^PW120^LL100^FDsecond^FS^XZ";
      await rendered;
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(renders).toBe(1);
      expect(pngSize(images(element)[0].src).width).toBe(120);
    });

    test("shows nothing for empty ZPL", async () => {
      const element = create();
      element.zpl = "";
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(images(element)).toStrictEqual([]);
    });
  });

  describe("errors", () => {
    test("shows the error and fires zpl-error for ZPL without labels", async () => {
      const element = create();
      const failed = nextError(element);
      element.zpl = "not zpl";

      const event = await failed;
      const message = element.shadowRoot!.querySelector("[part=error]")!;

      expect(event.detail.error).toBeInstanceOf(Error);
      expect(message.textContent).toMatch(/no labels parsed/i);
      expect(message.hasAttribute("hidden")).toBe(false);
      expect(images(element)).toStrictEqual([]);
    });

    test("clears the error once the ZPL renders", async () => {
      const element = create();
      const failed = nextError(element);
      element.zpl = "not zpl";
      await failed;

      const rendered = nextRender(element);
      element.zpl = "^XA^PW100^LL100^FDok^FS^XZ";
      await rendered;

      expect(
        element
          .shadowRoot!.querySelector("[part=error]")!
          .hasAttribute("hidden")
      ).toBe(true);
    });
  });

  describe("properties", () => {
    test("reflect numeric attributes", () => {
      const element = create();
      element.dpmm = 12;
      element.width = 50.8;

      expect(element.getAttribute("dpmm")).toBe("12");
      expect(element.getAttribute("width")).toBe("50.8");
      expect(element.height).toBeUndefined();
    });

    test("grayscale reflects as a boolean attribute", () => {
      const element = create();
      element.grayscale = true;
      expect(element.hasAttribute("grayscale")).toBe(true);
      element.grayscale = false;
      expect(element.hasAttribute("grayscale")).toBe(false);
    });

    test("the zpl property returns what was set", () => {
      const element = create();
      const label = { toZPL: () => "^XA^XZ" };
      element.zpl = label;

      expect(element.zpl).toBe(label);
    });
  });
});
