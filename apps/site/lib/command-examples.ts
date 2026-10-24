import "server-only";
import { Raster, encodePng, renderLabels } from "@zplkit/render";
import data from "@/content/commands.json";
import details from "@/content/command-details.json";
import { anchorOf } from "@/components/reference/anchor";

/** Examples render at 203 dpi, the most common resolution */
const DPMM = 8;
/** Blank dots kept around the ink */
const MARGIN = 16;

const lastValue = (zpl: string, command: string): number | undefined => {
  const matches = [...zpl.matchAll(new RegExp(`\\^${command}(\\d+)`, "g"))];
  const value = matches[matches.length - 1]?.[1];
  return value === undefined ? undefined : Number(value);
};

/** The raster cropped to its ink plus a margin, or undefined when blank */
const crop = (raster: Raster): Raster | undefined => {
  const { width, height, ink } = raster;
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (ink[y * width + x] > 0.05) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }
  if (right < 0) return undefined;

  left = Math.max(0, left - MARGIN);
  top = Math.max(0, top - MARGIN);
  right = Math.min(width - 1, right + MARGIN);
  bottom = Math.min(height - 1, bottom + MARGIN);
  const cropped = new Raster(right - left + 1, bottom - top + 1);
  for (let y = 0; y < cropped.height; y++) {
    cropped.ink.set(
      ink.subarray((top + y) * width + left, (top + y) * width + right + 1),
      y * cropped.width
    );
  }
  return cropped;
};

type Example = { file: string; width: number; height: number; png: Uint8Array };

let cache: Promise<Map<string, Example>> | undefined;

/**
 * Images of the reference's examples, rendered with zplkit's own renderer
 * at build time, for commands it draws. Keyed by command code.
 */
export const commandExamples = (): Promise<Map<string, Example>> =>
  (cache ??= (async () => {
    const examples = new Map<string, Example>();
    for (const command of data.commands) {
      const zpl = (details as Record<string, { example?: string }>)[
        command.code
      ]?.example;
      if (!command.drawn || command.support === "no" || !zpl) continue;

      const widthMm = (lastValue(zpl, "PW") ?? 812) / DPMM;
      const heightMm = (lastValue(zpl, "LL") ?? 1218) / DPMM;
      const [raster] = renderLabels(zpl, {
        widthMm,
        heightMm,
        dpmm: DPMM,
        antialias: true,
      });
      const cropped = raster && crop(raster);
      if (!cropped) continue;

      examples.set(command.code, {
        file: `${anchorOf(command.code)}.png`,
        width: cropped.width,
        height: cropped.height,
        png: await encodePng(cropped),
      });
    }
    return examples;
  })());
