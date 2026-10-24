/**
 * Decoding of ASCII graphic data (^GF A and ~DG): hex, including Zebra's
 * compression scheme, or base64 as :B64: and :Z64:. Based on zebrash (MIT,
 * https://github.com/ingridhq/zebrash).
 */
import { decodeObjectData } from "./data.js";

/** Repeat counts: G to Y are 1 to 19, g to z are 20 to 400 in steps of 20 */
const repeatCount = (char: string): number | undefined => {
  const code = char.charCodeAt(0);
  if (code >= 71 && code <= 89) return code - 70; // G-Y
  if (code >= 103 && code <= 122) return (code - 102) * 20; // g-z
  return undefined;
};

/**
 * Decode ASCII hex graphic data to bytes, one row of `bytesPerRow` after the
 * other. Supports Zebra's compression: repeat counts before a hex digit, `,`
 * to fill the rest of a row with 0, `!` to fill it with 1 and `:` to repeat
 * the previous row.
 */
const decodeGraphicData = (
  data: string,
  bytesPerRow: number,
  totalBytes: number
): Uint8Array => {
  if (/^:[BZ]64:/.test(data)) {
    // Short data leaves the rest of the graphic blank
    const bytes = new Uint8Array(totalBytes);
    bytes.set(
      (decodeObjectData(data) ?? new Uint8Array()).subarray(0, totalBytes)
    );
    return bytes;
  }

  const rowHex = bytesPerRow * 2;
  let hex = "";
  let row = "";
  let previousRow = "";
  let count = 0;

  const endRow = () => {
    hex += row;
    previousRow = row;
    row = "";
  };

  for (const char of data.replace(/\s/g, "")) {
    if (row.length >= rowHex) endRow();

    const repeat = repeatCount(char);
    if (repeat !== undefined) {
      count += repeat;
      continue;
    }

    if (char === "," || char === "!") {
      row = row.padEnd(rowHex, char === "," ? "0" : "F");
      count = 0;
      continue;
    }
    if (char === ":") {
      row = previousRow || "0".repeat(rowHex);
      count = 0;
      continue;
    }

    row += char.repeat(Math.max(count, 1));
    count = 0;
  }
  if (row.length) endRow();

  const bytes = new Uint8Array(totalBytes);
  for (let i = 0; i < totalBytes && i * 2 + 1 < hex.length; i++) {
    const value = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    bytes[i] = Number.isNaN(value) ? 0 : value;
  }
  return bytes;
};

export { decodeGraphicData };
