import LabelBuilder from "./Label.js";
import ZplError from "./ZplError.js";
import { Fragment, jsx } from "./jsx-runtime.js";
import type { ZplElement, ZplNode } from "./jsx-runtime.js";
import type { Color, StorageDevice } from "./ast.js";
import type { Graphic, Orientation, ZebraFontFamily } from "./types.js";
import type { Length } from "./units.js";

type Position = { x: Length; y: Length };

/** Text content: strings and numbers are joined, false/null/undefined skipped */
type TextChild = string | number | boolean | null | undefined;
type TextChildren = TextChild | TextChild[];

type LabelProps = ConstructorParameters<typeof LabelBuilder>[0] & {
  children?: ZplNode;
};

const REACT_FRAGMENT = Symbol.for("react.fragment");

/** How to draw each built-in element, keyed by its component */
const primitives = new Map<
  unknown,
  (label: LabelBuilder, props: never) => void
>();

/**
 * Define a built-in element. Calling the component only creates an element;
 * build() looks up the draw function when it reaches the element.
 */
const primitive = <P>(
  draw: (label: LabelBuilder, props: P) => void
): ((props: P) => ZplElement) => {
  const component = (props: P): ZplElement => jsx(component, props);
  primitives.set(component, draw);
  return component;
};

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
const Label = (props: LabelProps): ZplElement => jsx(Label, props);

/**
 * Draw a node on the label: built-in elements are drawn, components are
 * called and their result drawn, and false, null and undefined are skipped
 * so that `{condition && <Text>…</Text>}` works. Works on elements created
 * by node-zpl's JSX runtime as well as React's.
 */
const draw = (label: LabelBuilder, node: unknown): void => {
  if (Array.isArray(node)) {
    for (const child of node) draw(label, child);
    return;
  }

  if (node === null || node === undefined || typeof node === "boolean") {
    return;
  }

  if (typeof node !== "object" || !("type" in node) || !("props" in node)) {
    throw new ZplError(
      `Unexpected child ${JSON.stringify(
        node
      )}: text has to be wrapped in <Text>`
    );
  }

  const { type, props } = node as {
    type: unknown;
    props: { children?: unknown };
  };
  const drawPrimitive = primitives.get(type);

  if (type === Label) {
    throw new ZplError("A <Label> cannot be placed inside another <Label>");
  } else if (drawPrimitive) {
    drawPrimitive(label, props as never);
  } else if (type === Fragment || type === REACT_FRAGMENT) {
    draw(label, props.children);
  } else if (typeof type === "function") {
    draw(label, type(props));
  } else if (typeof type === "string") {
    throw new ZplError(`<${type}> can't be used in a label`);
  } else {
    throw new ZplError(`Unsupported element type: ${String(type)}`);
  }
};

/**
 * Turn a <Label> element, or a component that returns one, into a Label
 * builder, which has toZPL(), validate() and the label's commands
 */
const build = (root: ZplElement): LabelBuilder => {
  // Unwrap components like <ShippingLabel /> until the <Label> appears
  while (
    typeof root?.type === "function" &&
    root.type !== Label &&
    !primitives.has(root.type) &&
    root.type !== Fragment
  ) {
    root = root.type(root.props);
  }

  if (root?.type !== Label) {
    throw new ZplError("build() expects a <Label> element");
  }

  const { children, ...options } = root.props as LabelProps;
  const label = new LabelBuilder(options);
  draw(label, children);

  return label;
};

/** Set the default font (^CF) for the text that follows */
const DefaultFont = primitive(
  (
    label,
    props: {
      font: ZebraFontFamily | string;
      height?: Length;
      width?: Length;
    }
  ) => label.setDefaultFont(props)
);

/** Set the orientation (^FW) of the fields that follow and don't give one */
const FieldOrientation = primitive(
  (label, props: { orientation: Orientation }) =>
    label.setFieldOrientation(props.orientation)
);

/** Text. Without font props it uses the label's default font. */
const Text = primitive(
  (
    label,
    props: Position & {
      font?: ZebraFontFamily | string;
      /** A font file on the printer, like "E:ARIAL.TTF", instead of a font */
      file?: string;
      height?: Length;
      width?: Length;
      orientation?: Orientation;
      children: TextChildren;
    }
  ) => {
    const { font, file, height, width, orientation } = props;
    const hasFont =
      font !== undefined ||
      file !== undefined ||
      height !== undefined ||
      width !== undefined ||
      orientation !== undefined;

    label.drawText({
      position: position(props),
      text: text(props.children),
      font: hasFont
        ? { name: font, file, height, width, orientation }
        : undefined,
    });
  }
);

/** A box or line */
const Box = primitive(
  (
    label,
    props: Position & {
      width: Length;
      height: Length;
      thickness: Length;
      color?: Color;
      rounding?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
    }
  ) => label.drawBox({ ...props, position: position(props) })
);

type BarcodeProps = Position & {
  height?: Length;
  orientation?: Orientation;
  printHri?: boolean;
  printHriAbove?: boolean;
  children: TextChildren;
};

/** Code 11 barcode, with the data as children */
const Code11 = primitive(
  (label, { children, ...props }: BarcodeProps & { checkDigits?: 1 | 2 }) =>
    label.drawCode11({
      ...props,
      position: position(props),
      data: text(children),
    })
);

/** Code 128 barcode, with the data as children */
const Code128 = primitive(
  (
    label,
    {
      children,
      ...props
    }: BarcodeProps & { useUcc?: boolean; mode?: "N" | "U" | "A" | "D" }
  ) =>
    label.drawCode128({
      ...props,
      position: position(props),
      data: text(children),
    })
);

/** Code 39 barcode, with the data as children */
const Code39 = primitive(
  (label, { children, ...props }: BarcodeProps & { checkDigit?: boolean }) =>
    label.drawCode39({
      ...props,
      position: position(props),
      data: text(children),
    })
);

/** Interleaved 2 of 5 barcode, with the digits as children */
const Interleaved2of5 = primitive(
  (label, { children, ...props }: BarcodeProps & { checkDigit?: boolean }) =>
    label.drawInterleaved2of5({
      ...props,
      position: position(props),
      data: text(children),
    })
);

/** PDF417 barcode, with the data as children */
const PDF417 = primitive(
  (
    label,
    {
      children,
      ...props
    }: Position & {
      rowHeight?: Length;
      securityLevel?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
      columns?: number;
      rows?: number;
      truncate?: boolean;
      orientation?: Orientation;
      children: TextChildren;
    }
  ) =>
    label.drawPDF417({
      ...props,
      position: position(props),
      data: text(children),
    })
);

/** Aztec code, with the data as children */
const Aztec = primitive(
  (
    label,
    {
      children,
      ...props
    }: Position & {
      moduleSize?: Length;
      errorControl?: number;
      orientation?: Orientation;
      children: TextChildren;
    }
  ) =>
    label.drawAztec({
      ...props,
      position: position(props),
      data: text(children),
    })
);

/** MaxiCode, with the data as children */
const MaxiCode = primitive(
  (
    label,
    {
      children,
      ...props
    }: Position & { mode?: 2 | 3 | 4 | 5 | 6; children: TextChildren }
  ) =>
    label.drawMaxiCode({
      ...props,
      position: position(props),
      data: text(children),
    })
);

/** EAN-13 barcode, with the 12 data digits as children */
const EAN13 = primitive((label, { children, ...props }: BarcodeProps) =>
  label.drawEAN13({
    ...props,
    position: position(props),
    data: text(children),
  })
);

/** Data Matrix code, with the data as children */
const DataMatrix = primitive(
  (
    label,
    {
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
    }
  ) =>
    label.drawDataMatrix({
      ...props,
      position: position(props),
      data: text(children),
    })
);

/** QR code, with the data as children */
const QrCode = primitive(
  (
    label,
    {
      children,
      ...props
    }: Position & {
      moduleSize?: Length;
      errorCorrection?: "H" | "Q" | "M" | "L";
      children: TextChildren;
    }
  ) =>
    label.drawQrCode({
      ...props,
      position: position(props),
      data: text(children),
    })
);

/**
 * A field with any command, for elements without their own component. The
 * command is added as written; children are the escaped field data.
 */
const Field = primitive(
  (
    label,
    {
      children,
      ...props
    }: Position & {
      command: `${"^" | "~"}${string}`;
      children?: TextChildren;
    }
  ) =>
    label.drawField({
      command: props.command,
      position: position(props),
      data: children === undefined ? undefined : text(children),
    })
);

/** An image, e.g. from ImageConverter */
const Graphic = primitive((label, props: Position & { graphic: Graphic }) =>
  label.drawGraphic({ position: position(props), graphic: props.graphic })
);

/** A graphic stored on the printer with PrinterSetup.storeGraphic() */
const StoredGraphic = primitive(
  (
    label,
    props: Position & {
      name: string;
      device?: StorageDevice;
      magnification?: { x: number; y: number };
    }
  ) => label.drawStoredGraphic({ ...props, position: position(props) })
);

/** ZPL for commands without an element, added verbatim */
const Raw = primitive((label, props: { zpl: string }) => label.raw(props.zpl));

export {
  Label,
  build,
  DefaultFont,
  FieldOrientation,
  Text,
  Box,
  Code11,
  Code128,
  Code39,
  Interleaved2of5,
  PDF417,
  Aztec,
  MaxiCode,
  EAN13,
  DataMatrix,
  QrCode,
  Field,
  Graphic,
  StoredGraphic,
  Raw,
};
export { Fragment } from "./jsx-runtime.js";
export { mm, dots } from "./units.js";
export { Orientation, ZebraFontFamily } from "./types.js";
export type { ZplElement, ZplNode } from "./jsx-runtime.js";
