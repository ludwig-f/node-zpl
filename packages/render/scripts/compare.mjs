// Compare our render of ZPL files with Labelary's and zebrash's (via zpl-renderer-js).
// Usage: node scripts/compare.mjs [--diff] widthIn heightIn dpmm file.zpl...
//
// Agreement is the share of printed dots two renderers have in common
// (intersection over union). Where Labelary and zebrash agree but we don't,
// it's likely our bug; where they disagree, check Zebra's guide or a printout.
// With --diff, writes file.diff.png: black where all three print, red where
// only the others print, blue where only we print.
import { readFileSync, writeFileSync } from "node:fs";
import { inflateSync, deflateSync } from "node:zlib";
import { zplToBase64Async } from "zpl-renderer-js";
import { renderLabels } from "../build/index.js";

const args = process.argv.slice(2);
const diff = args[0] === "--diff" ? args.shift() : undefined;
const [widthIn, heightIn, dpmm, ...files] = args;
const widthMm = Number(widthIn) * 25.4;
const heightMm = Number(heightIn) * 25.4;

/** Black dots of a 1-bit or 8-bit grayscale PNG */
const decode = (png) => {
  let offset = 8,
    width = 0,
    height = 0,
    depth = 8,
    colorType = 0;
  const idat = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("latin1", offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR")
      [width, height, depth, colorType] = [
        data.readUInt32BE(0),
        data.readUInt32BE(4),
        data[8],
        data[9],
      ];
    if (type === "IDAT") idat.push(data);
    offset += 12 + length;
  }
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  const bpp = Math.max(1, (depth * channels) / 8);
  const stride = Math.ceil((width * depth * channels) / 8);
  const raw = inflateSync(Buffer.concat(idat));
  const dots = new Uint8Array(width * height);
  let previous = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = Uint8Array.from(
      raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    );
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0,
        b = previous[i],
        c = i >= bpp ? previous[i - bpp] : 0;
      const p = a + b - c,
        pa = Math.abs(p - a),
        pb = Math.abs(p - b),
        pc = Math.abs(p - c);
      line[i] =
        (line[i] +
          [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][
            filter
          ]) &
        255;
    }
    for (let x = 0; x < width; x++) {
      dots[y * width + x] =
        depth === 1
          ? !((line[x >> 3] >> (7 - (x & 7))) & 1)
          : line[x * channels] < 128;
    }
    previous = line;
  }
  return { width, height, dots };
};

const agreement = (a, b, width, height) => {
  let both = 0,
    either = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = a.width > x && a.dots[y * a.width + x],
        q = b.width > x && b.dots[y * b.width + x];
      if (p && q) both++;
      if (p || q) either++;
    }
  }
  return either ? `${((both / either) * 100).toFixed(1)}%` : "empty";
};

for (const file of files) {
  const zpl = readFileSync(file, "utf8");
  const labelary = await fetch(
    `https://api.labelary.com/v1/printers/${dpmm}dpmm/labels/${widthIn}x${heightIn}/0/`,
    {
      method: "POST",
      headers: {
        Accept: "image/png",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: zpl,
    }
  ).then(async (r) => decode(Buffer.from(await r.arrayBuffer())));
  const zebrash = decode(
    Buffer.from(
      await zplToBase64Async(zpl, widthMm, heightMm, Number(dpmm)),
      "base64"
    )
  );
  const [raster] = renderLabels(zpl, { widthMm, heightMm, dpmm: Number(dpmm) });
  const ours = {
    width: raster.width,
    height: raster.height,
    dots: raster.ink.map((v) => (v >= 0.5 ? 1 : 0)),
  };

  const w = labelary.width,
    h = labelary.height;
  console.log(
    `${file.split("/").pop().padEnd(28)} ours–Labelary ${agreement(
      ours,
      labelary,
      w,
      h
    ).padStart(6)}   ours–zebrash ${agreement(ours, zebrash, w, h).padStart(
      6
    )}   Labelary–zebrash ${agreement(labelary, zebrash, w, h).padStart(6)}`
  );

  if (diff) {
    const out = Buffer.alloc(h * (w * 3 + 1));
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const o = ours.dots[y * ours.width + x],
          t =
            labelary.dots[y * w + x] ||
            (zebrash.width > x && zebrash.dots[y * zebrash.width + x]);
        out.set(
          o && t
            ? [0, 0, 0]
            : t
            ? [230, 40, 40]
            : o
            ? [40, 80, 230]
            : [255, 255, 255],
          y * (w * 3 + 1) + 1 + x * 3
        );
      }
    const crc = (b) => {
      let c = ~0;
      for (const x of b) {
        c ^= x;
        for (let k = 0; k < 8; k++)
          c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      return ~c >>> 0;
    };
    const chunk = (t, d) => {
      const head = Buffer.alloc(8);
      head.writeUInt32BE(d.length);
      head.write(t, 4, "latin1");
      const c = Buffer.alloc(4);
      c.writeUInt32BE(crc(Buffer.concat([head.subarray(4), d])));
      return Buffer.concat([head, d, c]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w);
    ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8;
    ihdr[9] = 2;
    writeFileSync(
      file.replace(/\.zpl$/, ".diff.png"),
      Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        chunk("IHDR", ihdr),
        chunk("IDAT", deflateSync(out)),
        chunk("IEND", Buffer.alloc(0)),
      ])
    );
  }
  await new Promise((r) => setTimeout(r, 400));
}
