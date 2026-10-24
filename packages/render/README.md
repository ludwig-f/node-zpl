# @zplkit/render

[![npm](https://img.shields.io/npm/v/@zplkit/render)](https://www.npmjs.com/package/@zplkit/render)

Renders ZPL labels to images in pure TypeScript, in Node and the browser. No WebAssembly, no native dependencies.

It draws:

- Boxes, circles and diagonal lines (`^GB`, `^GC`, `^GD`) and images (`^GF`, `~DG` or `~DY` with `^XG`), in hex or base64 (`:B64:`, `:Z64:`)
- Text in font 0 and the bitmap fonts A to H (`^A`, `^CF`), rotated (`^FW`) and wrapped in blocks (`^FB`)
- Text in TrueType fonts, downloaded (`~DU`, `~DY`) or passed in, and called by name (`^A@`) or letter (`^CW`)
- Code 128, Code 39, Interleaved 2 of 5, EAN-13, Code 11, PDF417, QR codes, Data Matrix, Aztec and MaxiCode (`^BC`, `^B3`, `^B2`, `^BE`, `^B1`, `^B7`, `^BQ`, `^BX`, `^BO`, `^BD`, `^BY`)
- Graphic symbols (`^GS`), stored formats (`^DF`, `^XF`, `^FN`), labels printed upside down (`^PO`) and stored images as backgrounds (`^IL`)
- Reverse printing (`^FR`, `^LR`), label home (`^LH`), print width (`^PW`) and UTF-8 text (`^CI28`)

Other barcodes are drawn as a crossed-out box naming the command. Commands it understands but doesn't draw yet are listed in each label's `layout().unsupported`. The [supported commands table](https://zpl.fingal.dev/docs/commands) lists them all.

## Usage

```bash
npm install @zplkit/render
```

```ts
import { renderZpl } from "@zplkit/render";

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

A font that isn't there prints in font 0, and its command is listed in `layout().unsupported`.

`renderLabels()` returns the rasters instead of PNGs, and `layout()` the elements that will be drawn, each with the indices of the commands that produced it.

## Accuracy

Geometry follows Zebra's ZPL II Programming Guide, and every element is tested dot for dot against how Zebra printers draw it. Boxes, circles, diagonals, images and barcode bars come out exactly as printed. Data Matrix and PDF417 symbols have the same size as a printer's but can encode the data differently, which scanners read the same; long runs of digits can make a PDF417 symbol a row shorter.

Zebra's fonts can't be redistributed, so open-licensed fonts stand in for them (see [fonts/README.md](fonts/README.md)): text takes the same space as on a printer, but letters look slightly different.
