// Requires pngjs (npm install pngjs). Run with: node scripts/measure-font0-advances.mjs
// Measure font 0 advance widths at ^A0N,100,100 for every character the label font supports
import { PNG } from "pngjs";
import { writeFileSync } from "fs";
const ranges = [
  [0x21, 0x7e],
  [0xa1, 0xff],
  [0x100, 0x17f],
];
const extra = [..."–—‘’“”•…€™ƒ‚„†‡‰‹›"].map((c) => c.codePointAt(0));
const codes = [
  ...ranges.flatMap(([a, b]) =>
    Array.from({ length: b - a + 1 }, (_, i) => a + i)
  ),
  ...extra,
];
const esc = (c) =>
  /[\^~_]/.test(c) ? "_" + c.charCodeAt(0).toString(16).toUpperCase() : c;
// Rows are far enough apart that accents above capitals stay within their own row's window
const perLabel = 7,
  gap = 170,
  result = {};
const measure = async (rows) => {
  const body = rows
    .map((t, k) => `^FO20,${45 + k * gap}^A0N,100,100^FH^FD${t}^FS`)
    .join("");
  const res = await fetch(
    "http://api.labelary.com/v1/printers/8dpmm/labels/8x12/0/",
    {
      method: "POST",
      headers: {
        Accept: "image/png",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `^XA^CI28^PW1624^LL2436${body}^XZ`,
    }
  );
  if (!res.ok) throw new Error("HTTP " + res.status);
  const png = PNG.sync.read(Buffer.from(await res.arrayBuffer()));
  await new Promise((r) => setTimeout(r, 350));
  return rows.map((_, k) => {
    let min = 1e9,
      max = -1;
    const top = 45 + k * gap - 45;
    for (let y = Math.max(0, top); y < top + gap; y++)
      for (let x = 0; x < png.width; x++)
        if (png.data[(y * png.width + x) * 4] < 128) {
          min = Math.min(min, x);
          max = Math.max(max, x);
        }
    return max < 0 ? null : max - min + 1;
  });
};
for (let i = 0; i < codes.length; i += perLabel) {
  const group = codes
    .slice(i, i + perLabel)
    .map((c) => String.fromCodePoint(c));
  const widths = await measure(
    group.flatMap((c) => [esc(c), esc(c).repeat(10)])
  );
  group.forEach((c, k) => {
    const [one, ten] = [widths[2 * k], widths[2 * k + 1]];
    result[c.codePointAt(0)] =
      one === null ? null : Math.round(((ten - one) / 9) * 100) / 100;
  });
  process.stdout.write(".");
}
// Space: no ink, so measure "H" + 10 spaces + "H" against "HH"
const [hh, spaced] = await measure(["HH", "H" + " ".repeat(10) + "H"]);
result[32] = Math.round(((spaced - hh) / 10) * 100) / 100;
writeFileSync(
  new URL("../fonts/font0-advances.json", import.meta.url),
  JSON.stringify(result)
);
const missing = Object.entries(result)
  .filter(([, v]) => v === null)
  .map(([c]) => String.fromCodePoint(+c));
console.log(
  `\n${Object.keys(result).length} characters, space ${
    result[32]
  }, without ink: ${missing.join(" ") || "none"}`
);
