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

Geometry follows Zebra's ZPL II Programming Guide. `scripts/compare.mjs` compares our render of any ZPL file with two references, [Labelary](https://labelary.com) and [zebrash](https://github.com/ingridhq/zebrash): where both agree and we don't, it's likely our bug; where they disagree, Zebra's guide or a real printout decides.

```bash
pnpm --filter @node-zpl/render build
node packages/render/scripts/compare.mjs --diff 4 6 8 label.zpl
```

Boxes, circles, diagonals and images match Labelary dot for dot, except large rounded corners, where we match zebrash instead.

Parts of the design and the graphic decoding are based on [zebrash](https://github.com/ingridhq/zebrash) (MIT).
