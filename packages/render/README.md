# @node-zpl/render

Renders ZPL labels to images in pure TypeScript, in Node and the browser. No WebAssembly, no native dependencies.

It draws:

- Boxes, circles and diagonal lines (`^GB`, `^GC`, `^GD`) and images (`^GF`, `~DG` or `~DY` with `^XG`), in hex or base64 (`:B64:`, `:Z64:`)
- Text in font 0 and the bitmap fonts A to H (`^A`, `^CF`), rotated (`^FW`) and wrapped in blocks (`^FB`)
- Text in TrueType fonts, downloaded (`~DU`, `~DY`) or passed in, and called by name (`^A@`) or letter (`^CW`)
- Code 128, Code 39, Interleaved 2 of 5, EAN-13, Code 11, PDF417, QR codes, Data Matrix, Aztec and MaxiCode (`^BC`, `^B3`, `^B2`, `^BE`, `^B1`, `^B7`, `^BQ`, `^BX`, `^BO`, `^BD`, `^BY`)
- Graphic symbols (`^GS`), stored formats (`^DF`, `^XF`, `^FN`), labels printed upside down (`^PO`) and stored images as backgrounds (`^IL`)
- Reverse printing (`^FR`, `^LR`), label home (`^LH`), print width (`^PW`) and UTF-8 text (`^CI28`)

Other barcodes are drawn as a crossed-out box naming the command. Commands it understands but doesn't draw yet are listed in each label's `layout().unsupported`.

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

### Fonts on the printer

Labels can call fonts that are already stored on the printer, like `^A@N,30,30,E:ARIAL.TTF`. Pass them in by path, and a path without a device matches any device:

```ts
const [png] = await renderZpl(zpl, {
  ...size,
  fonts: { "E:ARIAL.TTF": readFileSync("arial.ttf") },
});
```

A font that isn't there prints in font 0, like Labelary does, and its command is listed in `layout().unsupported`.

`renderLabels()` returns the rasters instead of PNGs, and `layout()` the elements that will be drawn, each with the indices of the commands that produced it.

## Accuracy

Geometry follows Zebra's ZPL II Programming Guide. `scripts/compare.mjs` compares our render of any ZPL file with two references, [Labelary](https://labelary.com) and [zebrash](https://github.com/ingridhq/zebrash): where both agree and we don't, it's likely our bug; where they disagree, Zebra's guide or a real printout decides.

```bash
pnpm --filter @node-zpl/render build
node packages/render/scripts/compare.mjs --diff 4 6 8 label.zpl
```

Boxes, circles, diagonals, images and barcode bars match Labelary dot for dot, except large rounded corners, where we match zebrash instead. Data Matrix and PDF417 symbols have the same size but can encode data differently, which scanners read the same; long runs of digits can make a PDF417 symbol a row shorter.

Zebra's fonts can't be redistributed, so open-licensed fonts stand in for them (see [fonts/README.md](fonts/README.md)): text takes the same space as on a printer, but letters look slightly different.

Parts of the design and the graphic decoding are based on [zebrash](https://github.com/ingridhq/zebrash) (MIT).
