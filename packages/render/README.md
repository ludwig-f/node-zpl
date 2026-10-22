# @node-zpl/render

Renders ZPL labels to images in pure TypeScript, in Node and the browser. No WebAssembly, no native dependencies.

> [!NOTE]
> Work in progress. Boxes, circles, diagonal lines, images (`^GF`, `~DG`/`^XG`) and reverse printing are supported; text and barcodes are next. Until then, [`@node-zpl/preview`](../preview) uses zpl-renderer-js.

```ts
import { renderZpl } from "@node-zpl/render";

const [png] = await renderZpl("^XA^FO50,50^GB200,100,4^FS^XZ", {
  widthMm: 50.8,
  heightMm: 25.4,
  dpmm: 8,
  grayscale: false,
});
// png is a base64-encoded PNG, one per label
```

By default it prints whole dots the way a printer does: a dot is printed when its center falls inside a shape. `grayscale: true` anti-aliases edges instead, for smoother images on screen.

`renderLabels()` returns the rasters instead of PNGs, and `layout()` the elements that will be drawn, each with the indices of the commands that produced it.

## Accuracy

Geometry follows Zebra's ZPL II Programming Guide and is checked against [Labelary](https://labelary.com), which matches real printers closely. Boxes, circles, diagonals and images match Labelary dot for dot; large rounded corners can differ by a few dots. `scripts/compare-labelary.mjs` compares any ZPL file with Labelary's render:

```bash
pnpm --filter @node-zpl/render build
node packages/render/scripts/compare-labelary.mjs label.zpl 4 6 8
```

Parts of the design and the graphic decoding are based on [zebrash](https://github.com/ingridhq/zebrash) (MIT).
