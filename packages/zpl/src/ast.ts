/**
 * Abstract syntax tree for ZPL.
 *
 * ZPL is a stream of commands interpreted by a state machine (fonts, ^BY
 * defaults and field origins carry over between commands), so a label is a
 * flat list of command nodes rather than a nested tree. Each node maps 1:1 to
 * a single ZPL command, which keeps the AST lossless: parse -> serialize
 * yields the same commands.
 *
 * All lengths are in dots, ZPL's native unit. Optional parameters that are
 * left undefined are omitted from the output so the printer default applies.
 *
 * Parameter names and defaults follow the Zebra ZPL II Programming Guide.
 */

/** Character offsets of a node in its source text, set by the parser */
type Span = { start: number; end: number };

type Orientation = "N" | "R" | "I" | "B";
type Color = "B" | "W";
type Justification = 0 | 1 | 2;

type Node<T extends string, P = object> = { type: T; span?: Span } & P;

/** `^XA` */
type StartFormat = Node<"StartFormat">;
/** `^XZ` */
type EndFormat = Node<"EndFormat">;
/** `^PWa` */
type PrintWidth = Node<"PrintWidth", { width: number }>;
/** `^LLy` */
type LabelLength = Node<"LabelLength", { length: number }>;
/** `^LHx,y` */
type LabelHome = Node<"LabelHome", { x: number; y: number }>;
/** `^LRa` */
type LabelReverse = Node<"LabelReverse", { reverse: boolean }>;
/** `^CIa` */
type ChangeEncoding = Node<"ChangeEncoding", { charset: number }>;
/** `^CFf,h,w` */
type DefaultFont = Node<
  "DefaultFont",
  { font: string; height?: number; width?: number }
>;

/** `^FWr,z` - default orientation and justification for the following fields */
type FieldOrientation = Node<
  "FieldOrientation",
  { orientation: Orientation; justification?: Justification }
>;
/** `^FOx,y,z` */
type FieldOrigin = Node<
  "FieldOrigin",
  { x: number; y: number; justification?: Justification }
>;
/** `^FTx,y,z` */
type FieldTypeset = Node<
  "FieldTypeset",
  { x?: number; y?: number; justification?: Justification }
>;
/** `^Afo,h,w` */
type Font = Node<
  "Font",
  {
    font: string;
    orientation?: Orientation;
    height?: number;
    width?: number;
  }
>;
/** `^FBa,b,c,d,e` */
type FieldBlock = Node<
  "FieldBlock",
  {
    width: number;
    maxLines?: number;
    lineSpacing?: number;
    justification?: "L" | "C" | "R" | "J";
    hangingIndent?: number;
  }
>;
/** `^FR` */
type FieldReverse = Node<"FieldReverse">;
/** `^FHa` */
type FieldHexIndicator = Node<"FieldHexIndicator", { indicator?: string }>;
/** `^FD` - data is stored exactly as written, including any ^FH escapes */
type FieldData = Node<"FieldData", { data: string }>;
/** `^FS` */
type FieldSeparator = Node<"FieldSeparator">;
/** `^FX` */
type Comment = Node<"Comment", { text: string }>;

/** `^GBw,h,t,c,r` */
type GraphicBox = Node<
  "GraphicBox",
  {
    width?: number;
    height?: number;
    thickness?: number;
    color?: Color;
    rounding?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  }
>;
/** `^GCd,t,c` */
type GraphicCircle = Node<
  "GraphicCircle",
  { diameter?: number; thickness?: number; color?: Color }
>;
/** `^GDw,h,t,c,o` */
type GraphicDiagonal = Node<
  "GraphicDiagonal",
  {
    width?: number;
    height?: number;
    thickness?: number;
    color?: Color;
    direction?: "R" | "L";
  }
>;
/** `^GFA,b,c,d,data` (ASCII hex only) */
type GraphicField = Node<
  "GraphicField",
  { byteCount: number; fieldCount: number; bytesPerRow: number; data: string }
>;
/** `^XGd:o.x,mx,my` */
type RecallGraphic = Node<
  "RecallGraphic",
  {
    device: StorageDevice;
    name: string;
    magnificationX?: number;
    magnificationY?: number;
  }
>;

/** `^BYw,r,h` */
type BarcodeDefaults = Node<
  "BarcodeDefaults",
  { moduleWidth?: number; ratio?: number; height?: number }
>;
/** `^B1o,e,h,f,g` */
type Code11 = Node<
  "Code11",
  {
    orientation?: Orientation;
    /** `Y` = 1 check digit, `N` = 2 check digits */
    checkDigits?: 1 | 2;
    height?: number;
    interpretationLine?: boolean;
    interpretationLineAbove?: boolean;
  }
>;
/** `^BCo,h,f,g,e,m` */
type Code128 = Node<
  "Code128",
  {
    orientation?: Orientation;
    height?: number;
    interpretationLine?: boolean;
    interpretationLineAbove?: boolean;
    uccCheckDigit?: boolean;
    mode?: "N" | "U" | "A" | "D";
  }
>;
/** `^B3o,e,h,f,g` */
type Code39 = Node<
  "Code39",
  {
    orientation?: Orientation;
    /** Adds a Mod-43 check digit */
    checkDigit?: boolean;
    height?: number;
    interpretationLine?: boolean;
    interpretationLineAbove?: boolean;
  }
>;
/** `^B2o,h,f,g,e` */
type Interleaved2of5 = Node<
  "Interleaved2of5",
  {
    orientation?: Orientation;
    height?: number;
    interpretationLine?: boolean;
    interpretationLineAbove?: boolean;
    /** Adds a Mod-10 check digit */
    checkDigit?: boolean;
  }
>;
/** `^B7o,h,s,c,r,t` */
type Pdf417 = Node<
  "Pdf417",
  {
    orientation?: Orientation;
    /** Height of each row in dots */
    rowHeight?: number;
    /** Error correction, 0 (detection only) to 8 */
    securityLevel?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
    /** Data columns, 1 to 30 */
    columns?: number;
    /** Rows, 3 to 90 */
    rows?: number;
    /** Leaves out the right row indicators and stop pattern */
    truncate?: boolean;
  }
>;
/** `^BEo,h,f,g` */
type Ean13 = Node<
  "Ean13",
  {
    orientation?: Orientation;
    height?: number;
    interpretationLine?: boolean;
    interpretationLineAbove?: boolean;
  }
>;
/** `^BXo,h,s,c,r,f,g,a` */
type DataMatrix = Node<
  "DataMatrix",
  {
    orientation?: Orientation;
    /** Size of each square module in dots */
    height?: number;
    quality?: 0 | 50 | 80 | 100 | 140 | 200;
    columns?: number;
    rows?: number;
    formatId?: 1 | 2 | 3 | 4 | 5 | 6;
    escapeCharacter?: string;
  }
>;

/** `^BQa,b,c,d,e` */
type QrCode = Node<
  "QrCode",
  {
    /** QR codes can't be rotated, so this is always N */
    orientation?: "N";
    model?: 1 | 2;
    /** Size of each square module in dots, 1 to 100 */
    magnification?: number;
    errorCorrection?: "H" | "Q" | "M" | "L";
    mask?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  }
>;

/** `~SDa` */
type SetDarkness = Node<"SetDarkness", { darkness: number }>;
/** `~DGd:o.x,t,w,data` */
type DownloadGraphic = Node<
  "DownloadGraphic",
  {
    device: StorageDevice;
    name: string;
    totalBytes: number;
    bytesPerRow: number;
    data: string;
  }
>;
/** `^IDd:o.x` */
type DeleteObject = Node<
  "DeleteObject",
  { device: StorageDevice; name: string; extension: string }
>;

/** Any command without a typed node; kept verbatim, prefix included */
type Raw = Node<"Raw", { zpl: string }>;

type StorageDevice = "R" | "E" | "B" | "A";

type Command =
  | StartFormat
  | EndFormat
  | PrintWidth
  | LabelLength
  | LabelHome
  | LabelReverse
  | ChangeEncoding
  | DefaultFont
  | FieldOrientation
  | FieldOrigin
  | FieldTypeset
  | Font
  | FieldBlock
  | FieldReverse
  | FieldHexIndicator
  | FieldData
  | FieldSeparator
  | Comment
  | GraphicBox
  | GraphicCircle
  | GraphicDiagonal
  | GraphicField
  | RecallGraphic
  | BarcodeDefaults
  | Code11
  | Code128
  | Code39
  | Interleaved2of5
  | Pdf417
  | Ean13
  | DataMatrix
  | QrCode
  | SetDarkness
  | DownloadGraphic
  | DeleteObject
  | Raw;

export type {
  Span,
  Orientation,
  Color,
  Justification,
  StorageDevice,
  Command,
  StartFormat,
  EndFormat,
  PrintWidth,
  LabelLength,
  LabelHome,
  LabelReverse,
  ChangeEncoding,
  DefaultFont,
  FieldOrientation,
  FieldOrigin,
  FieldTypeset,
  Font,
  FieldBlock,
  FieldReverse,
  FieldHexIndicator,
  FieldData,
  FieldSeparator,
  Comment,
  GraphicBox,
  GraphicCircle,
  GraphicDiagonal,
  GraphicField,
  RecallGraphic,
  BarcodeDefaults,
  Code11,
  Code128,
  Code39,
  Interleaved2of5,
  Pdf417,
  Ean13,
  DataMatrix,
  QrCode,
  SetDarkness,
  DownloadGraphic,
  DeleteObject,
  Raw,
};
