// Compare our render of a ZPL file with Labelary's, dot for dot.
// Usage: node scripts/compare-labelary.mjs label.zpl [widthIn heightIn dpmm]
// Writes label.diff.png: black where both print, red where only Labelary
// prints, blue where only we print.
import { readFileSync, writeFileSync } from "node:fs";
import { inflateSync, deflateSync } from "node:zlib";
import { renderLabels } from "../build/index.js";

const [file, widthIn = "4", heightIn = "6", dpmm = "8"] = process.argv.slice(2);
const zpl = readFileSync(file, "utf8");

const response = await fetch(
  `https://api.labelary.com/v1/printers/${dpmm}dpmm/labels/${widthIn}x${heightIn}/0/`,
  {
    method: "POST",
    headers: {
      Accept: "image/png",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: zpl,
  }
);
if (!response.ok) throw new Error(`Labelary: HTTP ${response.status}`);

// Decode Labelary's PNG (1-bit or 8-bit grayscale) to a set of black dots
const png = Buffer.from(await response.arrayBuffer());
let offset = 8,
  width = 0,
  height = 0,
  bitDepth = 8;
const idat = [];
while (offset < png.length) {
  const length = png.readUInt32BE(offset);
  const type = png.toString("latin1", offset + 4, offset + 8);
  const data = png.subarray(offset + 8, offset + 8 + length);
  if (type === "IHDR")
    [width, height, bitDepth] = [
      data.readUInt32BE(0),
      data.readUInt32BE(4),
      data[8],
    ];
  if (type === "IDAT") idat.push(data);
  offset += 12 + length;
}
const raw = inflateSync(Buffer.concat(idat));
const stride = Math.ceil((width * bitDepth) / 8);
const theirs = new Uint8Array(width * height);
let previous = new Uint8Array(stride);
for (let y = 0; y < height; y++) {
  const filter = raw[y * (stride + 1)];
  const line = Uint8Array.from(
    raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
  );
  const bpp = Math.max(1, bitDepth / 8);
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
    theirs[y * width + x] =
      bitDepth === 1 ? !((line[x >> 3] >> (7 - (x & 7))) & 1) : line[x] < 128;
  }
  previous = line;
}

const [ours] = renderLabels(zpl, {
  widthMm: Number(widthIn) * 25.4,
  heightMm: Number(heightIn) * 25.4,
  dpmm: Number(dpmm),
});
let onlyTheirs = 0,
  onlyOurs = 0,
  both = 0;
const out = Buffer.alloc(height * (width * 3 + 1));
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const t = theirs[y * width + x];
    const o =
      x < ours.width && y < ours.height && ours.ink[y * ours.width + x] >= 0.5;
    const color =
      t && o
        ? [0, 0, 0]
        : t
        ? [230, 40, 40]
        : o
        ? [40, 80, 230]
        : [255, 255, 255];
    if (t && o) both++;
    else if (t) onlyTheirs++;
    else if (o) onlyOurs++;
    out.set(color, y * (width * 3 + 1) + 1 + x * 3);
  }
}
const crc = (b) => {
  let c = ~0;
  for (const x of b) {
    c ^= x;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return ~c >>> 0;
};
const chunk = (t, d) => {
  const h = Buffer.alloc(8);
  h.writeUInt32BE(d.length);
  h.write(t, 4, "latin1");
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(Buffer.concat([h.subarray(4), d])));
  return Buffer.concat([h, d, c]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width);
ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8;
ihdr[9] = 2;
writeFileSync(
  file.replace(/\.zpl$/, "") + ".diff.png",
  Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(out)),
    chunk("IEND", Buffer.alloc(0)),
  ])
);

const total = both + onlyTheirs;
console.log(
  `${file}: Labelary prints ${total} dots; we match ${both} (${(
    (both / Math.max(total, 1)) *
    100
  ).toFixed(2)}%), miss ${onlyTheirs}, add ${onlyOurs}`
);
