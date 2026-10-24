"use client";

import { useState } from "react";
import type {} from "@zplkit/preview/react";
import { encodeShare } from "@/playground/share";
import { FadeInImage } from "./fade-in-image";

type Image = { file: string; width: number; height: number };

/** Examples render at 203 dpi, like their images */
const DPMM = 8;
/** Images show at three quarters of a pixel per dot */
const SCALE = 0.75;
/** Live previews render on a 4 by 6 inch label, then show what's printed */
const LABEL = { width: 812, height: 1218 };
/** Blank dots kept past the ink, as on the images */
const MARGIN = 16;

/** How far the ink in a rendered label reaches, in dots */
const inkExtent = (src: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0);
      const { data } = context.getImageData(0, 0, image.width, image.height);
      let right = 0;
      let bottom = 0;
      for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
          if (data[(y * image.width + x) * 4] < 128) {
            right = Math.max(right, x);
            bottom = Math.max(bottom, y);
          }
        }
      }
      resolve({ width: right + 1 + MARGIN, height: bottom + 1 + MARGIN });
    };
    image.src = src;
  });

/**
 * A command's example, editable. It shows the image rendered when the site
 * was built until the first edit, then renders in the browser with
 * <zpl-preview>, the same renderer, as you type.
 */
export function LiveExample({
  code,
  zpl,
  image,
}: {
  code: string;
  zpl: string;
  image?: Image;
}) {
  const [text, setText] = useState(zpl);
  const [live, setLive] = useState(false);
  // The area shown: the image's at first, growing with what the edits print
  const [shown, setShown] = useState(
    image ? { width: image.width, height: image.height } : undefined
  );
  const edited = text !== zpl;

  const edit = (value: string) => {
    setText(value);
    if (!live && image) {
      // Loads the element and, on its first render, the renderer
      void import("@zplkit/preview/react").then(() => setLive(true));
    }
  };

  const openInPlayground = async () => {
    const hash = await encodeShare({
      zpl: text,
      // The area shown, which grows with what the edits print
      widthMm: shown ? shown.width / DPMM : undefined,
      heightMm: shown ? shown.height / DPMM : undefined,
      dpmm: DPMM,
      smoothing: 0.4,
    });
    window.location.href = `/playground#${hash}`;
  };

  const button =
    "text-[13px] font-semibold text-accent hover:underline disabled:text-muted disabled:no-underline";

  return (
    <div className="grid gap-x-8 gap-y-4 @[720px]:grid-cols-[minmax(0,1fr)_auto]">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-baseline gap-4">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            Example
          </span>
          <span className="text-[12.5px] text-muted">
            {image ? "Edit it to see what prints" : "Editable"}
          </span>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => setText(zpl)}
            disabled={!edited}
            className={button}
          >
            Reset
          </button>
          <button type="button" onClick={openInPlayground} className={button}>
            Open in playground
          </button>
        </div>
        <textarea
          value={text}
          onChange={(event) => edit(event.target.value)}
          spellCheck={false}
          aria-label={`${code} example ZPL`}
          rows={Math.max(3, zpl.split("\n").length)}
          className="w-full resize-y rounded-md border border-rule-strong bg-code px-3 py-2.5 font-mono text-[13px] leading-[1.7] text-ink focus:border-accent focus:outline-none"
        />
      </div>

      {image && (
        <div className="@[720px]:pt-6">
          {/* The paper only dims in dark mode, so what's shown is what prints */}
          <div
            className="max-w-full overflow-hidden rounded-[6px] bg-paper shadow-label"
            style={{
              width: (shown ?? image).width * SCALE,
              height: live ? (shown ?? image).height * SCALE : undefined,
            }}
          >
            {live ? (
              <zpl-preview
                zpl={text}
                width={Math.max(LABEL.width, image.width) / DPMM}
                height={Math.max(LABEL.height, image.height) / DPMM}
                dpmm={DPMM}
                smoothing={1}
                onzpl-render={(event) => {
                  const [src] = event.detail.images;
                  if (!src) return;
                  void inkExtent(src).then((ink) =>
                    setShown({
                      width: Math.max(image.width, ink.width),
                      height: Math.max(image.height, ink.height),
                    })
                  );
                }}
                className="block mix-blend-multiply [&::part(label)]:w-full"
                style={{
                  width: Math.max(LABEL.width, image.width) * SCALE,
                }}
              />
            ) : (
              <FadeInImage
                src={`/reference/examples/${image.file}`}
                alt={`What the ${code} example prints`}
                width={image.width}
                height={image.height}
                loading="lazy"
                className="block h-auto w-full mix-blend-multiply"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
