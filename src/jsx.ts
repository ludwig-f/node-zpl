import LabelBuilder from "./Label.js";
import ZplError from "./ZplError.js";
import { applyChildren, element, isElement } from "./jsx-runtime.js";
import type { ZplElement, ZplNode } from "./jsx-runtime.js";
import type { Color, StorageDevice } from "./ast.js";
import type { Graphic, Orientation, ZebraFontFamily } from "./types.js";
import type { Length } from "./units.js";

type Position = { x: Length; y: Length };

/** Text content: strings and numbers are joined, false/null/undefined skipped */
type TextChild = string | number | boolean | null | undefined;
type TextChildren = TextChild | TextChild[];

const LABEL = Symbol("node-zpl.label");

type LabelProps = ConstructorParameters<typeof LabelBuilder>[0] & {
  children?: ZplNode;
};

type LabelElement = ZplElement & {
  readonly [LABEL]: LabelProps;
};

const isLabelElement = (value: unknown): value is LabelElement =>
  isElement(value) && LABEL in value;

const text = (children: TextChildren): string =>
  (Array.isArray(children) ? children : [children])
    .filter(
      (child) =>
        child !== null &&
        child !== undefined &&
        child !== false &&
        child !== true
    )
    .join("");

const position = ({ x, y }: Position) => ({ x, y });

/**
 * The root of every label. Turn it into a Label builder with build().
 * Takes the same options as the Label constructor.
 */
const Label = (props: LabelProps): ZplElement => {
  const label: LabelElement = {
    ...element(() => {
      throw new ZplError("A <Label> cannot be placed inside another <Label>");
    }),
    [LABEL]: props,
  };

  return label;
};

/**
 * Turn a <Label> element into a Label builder, which has toZPL(),
 * validate() and the label's commands
 */
const build = (root: ZplElement): LabelBuilder => {
  if (!isLabelElement(root)) {
    throw new ZplError("build() expects a <Label> element");
  }

  const { children, ...options } = root[LABEL];
  const label = new LabelBuilder(options);
  applyChildren(label, children);

  return label;
};

/** Set the default font (^CF) for the text that follows */
const DefaultFont = (props: {
  font: ZebraFontFamily | string;
  height?: Length;
  width?: Length;
}): ZplElement => element((label) => label.setDefaultFont(props));

/** Text. Without font props it uses the label's default font. */
const Text = (
  props: Position & {
    font?: ZebraFontFamily | string;
    height?: Length;
    width?: Length;
    orientation?: Orientation;
    children: TextChildren;
  }
): ZplElement =>
  element((label) => {
    const { font, height, width, orientation } = props;
    const hasFont =
      font !== undefined ||
      height !== undefined ||
      width !== undefined ||
      orientation !== undefined;

    label.drawText({
      position: position(props),
      text: text(props.children),
      font: hasFont ? { name: font, height, width, orientation } : undefined,
    });
  });

/** A box or line */
const Box = (
  props: Position & {
    width: Length;
    height: Length;
    thickness: Length;
    color?: Color;
    rounding?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  }
): ZplElement =>
  element((label) => label.drawBox({ ...props, position: position(props) }));

type BarcodeProps = Position & {
  height?: Length;
  orientation?: Orientation;
  printHri?: boolean;
  printHriAbove?: boolean;
  children: TextChildren;
};

/** Code 11 barcode, with the data as children */
const Code11 = ({
  children,
  ...props
}: BarcodeProps & { checkDigits?: 1 | 2 }): ZplElement =>
  element((label) =>
    label.drawCode11({
      ...props,
      position: position(props),
      data: text(children),
    })
  );

/** Code 128 barcode, with the data as children */
const Code128 = ({
  children,
  ...props
}: BarcodeProps & {
  useUcc?: boolean;
  mode?: "N" | "U" | "A" | "D";
}): ZplElement =>
  element((label) =>
    label.drawCode128({
      ...props,
      position: position(props),
      data: text(children),
    })
  );

/** EAN-13 barcode, with the 12 data digits as children */
const EAN13 = ({ children, ...props }: BarcodeProps): ZplElement =>
  element((label) =>
    label.drawEAN13({
      ...props,
      position: position(props),
      data: text(children),
    })
  );

/** Data Matrix code, with the data as children */
const DataMatrix = ({
  children,
  ...props
}: Position & {
  moduleSize: Length;
  orientation?: Orientation;
  quality?: 0 | 50 | 80 | 100 | 140 | 200;
  columns?: number;
  rows?: number;
  formatId?: 1 | 2 | 3 | 4 | 5 | 6;
  escapeCharacter?: string;
  children: TextChildren;
}): ZplElement =>
  element((label) =>
    label.drawDataMatrix({
      ...props,
      position: position(props),
      data: text(children),
    })
  );

/** An image, e.g. from ImageConverter */
const Graphic = (props: Position & { graphic: Graphic }): ZplElement =>
  element((label) =>
    label.drawGraphic({ position: position(props), graphic: props.graphic })
  );

/** A graphic stored on the printer with PrinterSetup.storeGraphic() */
const StoredGraphic = (
  props: Position & {
    name: string;
    device?: StorageDevice;
    magnification?: { x: number; y: number };
  }
): ZplElement =>
  element((label) =>
    label.drawStoredGraphic({ ...props, position: position(props) })
  );

/** ZPL for commands without an element, added verbatim */
const Raw = (props: { zpl: string }): ZplElement =>
  element((label) => label.raw(props.zpl));

export {
  Label,
  build,
  DefaultFont,
  Text,
  Box,
  Code11,
  Code128,
  EAN13,
  DataMatrix,
  Graphic,
  StoredGraphic,
  Raw,
};
export { Fragment } from "./jsx-runtime.js";
export { mm, dots } from "./units.js";
export { Orientation, ZebraFontFamily } from "./types.js";
export type { ZplElement, ZplNode } from "./jsx-runtime.js";
