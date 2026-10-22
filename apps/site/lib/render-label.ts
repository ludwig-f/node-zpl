import "server-only";

/**
 * Render ZPL to a PNG data URL on the server, with the same renderer the
 * playground uses in the browser. Used for pages rendered at build time, so
 * visitors don't download the renderer just to see an example label.
 */
export async function renderLabel(
  zpl: string,
  options: { widthMm: number; heightMm: number; dpmm: number }
): Promise<string> {
  const { zplToBase64Async } = await import("zpl-renderer-js");
  const png = await zplToBase64Async(
    zpl,
    options.widthMm,
    options.heightMm,
    options.dpmm,
    { grayscaleOutput: true }
  );
  return `data:image/png;base64,${png}`;
}
