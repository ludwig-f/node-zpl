/**
 * Registers <zpl-preview> and adds its props to React's JSX types.
 * Needs React 19, which sets props on custom elements as properties.
 */
import "./index.js";
import type { ZplPreview, ZplSource } from "./index.js";
import type { HTMLAttributes, RefAttributes } from "react";

type ZplPreviewProps = HTMLAttributes<ZplPreview> &
  RefAttributes<ZplPreview> & {
    zpl?: ZplSource;
    width?: number;
    height?: number;
    dpmm?: number;
    grayscale?: boolean;
    "onzpl-render"?: (event: CustomEvent<{ images: string[] }>) => void;
    "onzpl-error"?: (event: CustomEvent<{ error: Error }>) => void;
  };

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "zpl-preview": ZplPreviewProps;
    }
  }
}

export type { ZplPreviewProps };
