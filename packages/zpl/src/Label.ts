import ZplContent from "./ZplContent.js";
import ZplError from "./ZplError.js";
import { escapeFieldData, serialize } from "./serialize.js";
import { toDots } from "./units.js";
import { lint } from "./lint.js";
import type { LintDiagnostic } from "./lint.js";
import { ZebraFontFamily, Orientation } from "./types.js";
import type { Color, Command, StorageDevice } from "./ast.js";
import type { Graphic, Position } from "./types.js";
import type { Length } from "./units.js";

class Label extends ZplContent {
  protected readonly dpmm: number;

  /**
   * Construct a new label
   * @param options.width Label width
   * @param options.height Label height
   * @param options.dpmm Dots per millimeter of the printer (6, 8, 12 or 24 for 152, 203, 300 or 600 dpi)
   * @param options.reverse Reverse label (white on black) - defaults to false
   * @param options.characterSet Character set (^CI), defaults to 28 (UTF-8)
   * @param options.home Label home position - defaults to the top left corner
   * @param options.minify Whether to minify the ZPL output - defaults to true
   */
  constructor(options: {
    width: Length;
    height: Length;
    dpmm: 6 | 8 | 12 | 24;
    reverse?: boolean;
    characterSet?: number;
    home?: Position;
    minify?: boolean;
  }) {
    super({ minify: options.minify });
    this.dpmm = options.dpmm;

    const width = this.dots(options.width);
    const height = this.dots(options.height);
    const reverse = options.reverse ?? false;

    this.add(
      { type: "StartFormat" },
      { type: "PrintWidth", width },
      { type: "LabelLength", length: height },
      { type: "LabelReverse", reverse },
      { type: "ChangeEncoding", charset: options.characterSet ?? 28 },
      {
        type: "LabelHome",
        x: this.dots(options.home?.x ?? { dots: 0 }),
        y: this.dots(options.home?.y ?? { dots: 0 }),
      }
    );

    if (reverse) {
      // With ^LR every field is XORed with what is below it, so a solid black
      // background makes everything drawn on top of it come out white.
      this.addField({ x: { dots: 0 }, y: { dots: 0 } }, [
        {
          type: "GraphicBox",
          width,
          height,
          thickness: Math.min(width, height),
          color: "B",
          rounding: 0,
        },
      ]);
    }
  }

  private dots(length: Length): number {
    return toDots(length, this.dpmm);
  }

  /**
   * Add a complete field: origin, the given commands and a field separator
   */
  private addField(position: Position, commands: Command[]): this {
    return this.add(
      {
        type: "FieldOrigin",
        x: this.dots(position.x),
        y: this.dots(position.y),
      },
      ...commands,
      { type: "FieldSeparator" }
    );
  }

  /**
   * Field data commands, preceded by ^FH if the data needs escaping
   */
  private fieldData(data: string): Command[] {
    const escaped = escapeFieldData(data);

    return escaped.needsHexIndicator
      ? [
          { type: "FieldHexIndicator" },
          { type: "FieldData", data: escaped.data },
        ]
      : [{ type: "FieldData", data }];
  }

  private optionalDots(length: Length | undefined): number | undefined {
    return length === undefined ? undefined : this.dots(length);
  }

  /**
   * Manually open label
   */
  public open(): this {
    return this.add({ type: "StartFormat" });
  }

  /**
   * Close the label
   */
  public close(): this {
    return this.add({ type: "EndFormat" });
  }

  /**
   * Set the default font of the label
   * @param options.font Font to use, either a custom font or one of the built-in Zebra fonts
   * @param options.height Character height
   * @param options.width Character width
   */
  public setDefaultFont(options: {
    font: ZebraFontFamily | string;
    height?: Length;
    width?: Length;
  }): this {
    return this.add({
      type: "DefaultFont",
      font: options.font,
      height: this.optionalDots(options.height),
      width: this.optionalDots(options.width),
    });
  }

  /**
   * Set the orientation (^FW) of the fields that follow and don't give one
   * @param orientation Orientation of text and barcodes
   */
  public setFieldOrientation(orientation: Orientation): this {
    return this.add({ type: "FieldOrientation", orientation });
  }

  /**
   * Draw a box or line on the label
   * @param options.position Position (x, y) of the box
   * @param options.width Width of the box
   * @param options.height Height of the box
   * @param options.thickness Thickness of the border, use the smaller of width and height for a solid box
   * @param options.color Line color - defaults to black
   * @param options.rounding Degree of corner rounding from 0 (none) to 8 - defaults to 0
   */
  public box(options: {
    position: Position;
    width: Length;
    height: Length;
    thickness: Length;
    color?: Color;
    rounding?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  }): this {
    const { position, color = "B", rounding = 0 } = options;

    return this.addField(position, [
      {
        type: "GraphicBox",
        width: this.dots(options.width),
        height: this.dots(options.height),
        thickness: this.dots(options.thickness),
        color,
        rounding,
      },
    ]);
  }

  /**
   * Recall stored graphic and draw it on the label
   * @param options.position Position (x, y) of the graphic
   * @param options.name Name of the graphic
   * @param options.device Device where the graphic is stored - defaults to "R" (DRAM)
   * @param options.magnification Magnification of the graphic - defaults to 1
   */
  public storedGraphic(options: {
    position: Position;
    name: string;
    device?: StorageDevice;
    magnification?: { x: number; y: number };
  }): this {
    const {
      position,
      name,
      device = "R",
      magnification = { x: 1, y: 1 },
    } = options;

    return this.addField(position, [
      {
        type: "RecallGraphic",
        device,
        name,
        magnificationX: magnification.x,
        magnificationY: magnification.y,
      },
    ]);
  }

  /**
   * Draw a graphic on the label
   * @param options.position Position (x, y) of the graphic
   * @param options.graphic Graphic to draw, e.g. from ImageConverter
   */
  public graphic(options: { position: Position; graphic: Graphic }): this {
    const { position, graphic } = options;

    return this.addField(position, [
      {
        type: "GraphicField",
        byteCount: graphic.totalBytes,
        fieldCount: graphic.totalBytes,
        bytesPerRow: graphic.bytesPerRow,
        data: graphic.data,
      },
    ]);
  }

  /**
   * Draw text on the label. Characters that ZPL would read as commands are escaped.
   * @param options.text Text to draw
   * @param options.position Position (x, y) of the text
   * @param options.font Font to use - defaults to the label's default font
   * @param options.font.name Font name - defaults to font 0
   * @param options.font.file A font file on the printer instead, like "E:ARIAL.TTF" (see PrinterSetup.storeFont)
   * @param options.font.height Character height
   * @param options.font.width Character width
   * @param options.font.orientation Orientation of the text
   */
  public text(options: {
    text: string;
    position: Position;
    font?: {
      name?: ZebraFontFamily | string;
      file?: string;
      height?: Length;
      width?: Length;
      orientation?: Orientation;
    };
  }): this {
    const { text, position, font } = options;
    const commands: Command[] = [];

    if (font?.file !== undefined) {
      const match = /^(?:([REBA]):)?([^.:]+)\.(\w+)$/.exec(font.file);
      if (!match) {
        throw new ZplError(
          `Font file must be a name with an extension, like E:ARIAL.TTF, got '${font.file}'`
        );
      }
      commands.push({
        type: "FontByName",
        orientation: font.orientation,
        height: this.optionalDots(font.height),
        width: this.optionalDots(font.width),
        device: match[1] as StorageDevice | undefined,
        name: match[2],
        extension: match[3],
      });
    } else if (font) {
      commands.push({
        type: "Font",
        font: font.name ?? ZebraFontFamily.ZERO,
        orientation: font.orientation,
        height: this.optionalDots(font.height),
        width: this.optionalDots(font.width),
      });
    }

    return this.addField(position, [...commands, ...this.fieldData(text)]);
  }

  /**
   * Draw a Code 11 barcode on the label
   * @param options.position Position (x, y) of the barcode
   * @param options.data Data to encode
   * @param options.height Height of the barcode - defaults to the ^BY height
   * @param options.checkDigits Number of check digits - defaults to 2
   * @param options.orientation Orientation of the barcode
   * @param options.printHri Whether to print the human readable interpretation - defaults to true
   * @param options.printHriAbove Whether to print the human readable interpretation above the barcode - defaults to false
   */
  public code11(options: {
    position: Position;
    data: string;
    height?: Length;
    checkDigits?: 1 | 2;
    orientation?: Orientation;
    printHri?: boolean;
    printHriAbove?: boolean;
  }): this {
    return this.addField(options.position, [
      {
        type: "Code11",
        orientation: options.orientation,
        checkDigits: options.checkDigits,
        height: this.optionalDots(options.height),
        interpretationLine: options.printHri,
        interpretationLineAbove: options.printHriAbove,
      },
      ...this.fieldData(options.data),
    ]);
  }

  /**
   * Draw a Code 128 barcode on the label
   * @param options.position Position (x, y) of the barcode
   * @param options.data Data to encode
   * @param options.height Height of the barcode - defaults to the ^BY height
   * @param options.orientation Orientation of the barcode
   * @param options.printHri Whether to print the human readable interpretation - defaults to true
   * @param options.printHriAbove Whether to print the human readable interpretation above the barcode - defaults to false
   * @param options.useUcc Whether to add a UCC check digit - defaults to false
   * @param options.mode Mode of the barcode: N (none), U (UCC case), A (automatic) or D (UCC/EAN) - defaults to N
   */
  public code128(options: {
    position: Position;
    data: string;
    height?: Length;
    orientation?: Orientation;
    printHri?: boolean;
    printHriAbove?: boolean;
    useUcc?: boolean;
    mode?: "N" | "U" | "A" | "D";
  }): this {
    return this.addField(options.position, [
      {
        type: "Code128",
        orientation: options.orientation,
        height: this.optionalDots(options.height),
        interpretationLine: options.printHri,
        interpretationLineAbove: options.printHriAbove,
        uccCheckDigit: options.useUcc,
        mode: options.mode,
      },
      ...this.fieldData(options.data),
    ]);
  }

  /**
   * Draw a Code 39 barcode on the label
   * @param options.position Position (x, y) of the barcode
   * @param options.data Data to encode: digits, capital letters, space and - . $ / + %
   * @param options.height Height of the barcode - defaults to the ^BY height
   * @param options.checkDigit Whether to add a Mod-43 check digit - defaults to false
   * @param options.orientation Orientation of the barcode
   * @param options.printHri Whether to print the human readable interpretation - defaults to true
   * @param options.printHriAbove Whether to print the human readable interpretation above the barcode - defaults to false
   */
  public code39(options: {
    position: Position;
    data: string;
    height?: Length;
    checkDigit?: boolean;
    orientation?: Orientation;
    printHri?: boolean;
    printHriAbove?: boolean;
  }): this {
    return this.addField(options.position, [
      {
        type: "Code39",
        orientation: options.orientation,
        checkDigit: options.checkDigit,
        height: this.optionalDots(options.height),
        interpretationLine: options.printHri,
        interpretationLineAbove: options.printHriAbove,
      },
      ...this.fieldData(options.data),
    ]);
  }

  /**
   * Draw an Interleaved 2 of 5 barcode on the label
   * @param options.position Position (x, y) of the barcode
   * @param options.data Digits to encode; the printer adds a leading zero to an odd count
   * @param options.height Height of the barcode - defaults to the ^BY height
   * @param options.checkDigit Whether to add a Mod-10 check digit - defaults to false
   * @param options.orientation Orientation of the barcode
   * @param options.printHri Whether to print the human readable interpretation - defaults to true
   * @param options.printHriAbove Whether to print the human readable interpretation above the barcode - defaults to false
   */
  public interleaved2of5(options: {
    position: Position;
    data: string;
    height?: Length;
    checkDigit?: boolean;
    orientation?: Orientation;
    printHri?: boolean;
    printHriAbove?: boolean;
  }): this {
    return this.addField(options.position, [
      {
        type: "Interleaved2of5",
        orientation: options.orientation,
        height: this.optionalDots(options.height),
        interpretationLine: options.printHri,
        interpretationLineAbove: options.printHriAbove,
        checkDigit: options.checkDigit,
      },
      ...this.fieldData(options.data),
    ]);
  }

  /**
   * Draw a PDF417 barcode on the label
   * @param options.position Position (x, y) of the barcode
   * @param options.data Data to encode
   * @param options.rowHeight Height of each row - defaults to the ^BY height
   * @param options.securityLevel Error correction level, 0 (detection only) to 8 - defaults to 0
   * @param options.columns Number of data columns, 1 to 30
   * @param options.rows Number of rows, 3 to 90
   * @param options.truncate Whether to leave out the right row indicators and stop pattern - defaults to false
   * @param options.orientation Orientation of the barcode
   */
  public pdf417(options: {
    position: Position;
    data: string;
    rowHeight?: Length;
    securityLevel?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
    columns?: number;
    rows?: number;
    truncate?: boolean;
    orientation?: Orientation;
  }): this {
    return this.addField(options.position, [
      {
        type: "Pdf417",
        orientation: options.orientation,
        rowHeight: this.optionalDots(options.rowHeight),
        securityLevel: options.securityLevel,
        columns: options.columns,
        rows: options.rows,
        truncate: options.truncate,
      },
      ...this.fieldData(options.data),
    ]);
  }

  /**
   * Draw an Aztec code on the label
   * @param options.position Position (x, y) of the code
   * @param options.data Data to encode
   * @param options.moduleSize Size of each square module, 1 to 10 dots - defaults to the printer's
   * @param options.errorControl Error correction percentage (1 to 99), or 101 to 104 for a compact symbol and 201 to 232 for a full-range one with that many layers
   * @param options.orientation Orientation of the code
   */
  public aztec(options: {
    position: Position;
    data: string;
    moduleSize?: Length;
    errorControl?: number;
    orientation?: Orientation;
  }): this {
    return this.addField(options.position, [
      {
        type: "Aztec",
        orientation: options.orientation,
        magnification: this.optionalDots(options.moduleSize),
        errorControl: options.errorControl,
      },
      ...this.fieldData(options.data),
    ]);
  }

  /**
   * Draw a MaxiCode on the label, a fixed-size code used on parcels
   * @param options.position Position (x, y) of the code
   * @param options.data Data to encode; in modes 2 and 3 it starts with the class of service, country code and postal code
   * @param options.mode 2 or 3 for carrier messages with a numeric or alphanumeric postal code, 4 to 6 for other data - defaults to 2
   */
  public maxiCode(options: {
    position: Position;
    data: string;
    mode?: 2 | 3 | 4 | 5 | 6;
  }): this {
    return this.addField(options.position, [
      { type: "MaxiCode", mode: options.mode },
      ...this.fieldData(options.data),
    ]);
  }

  /**
   * Draw an EAN-13 barcode on the label
   * @param options.position Position (x, y) of the barcode
   * @param options.data Data to encode, 12 digits (the check digit is added by the printer)
   * @param options.height Height of the barcode - defaults to the ^BY height
   * @param options.printHri Whether to print the human readable interpretation - defaults to true
   * @param options.printHriAbove Whether to print the human readable interpretation above the barcode - defaults to false
   * @param options.orientation Orientation of the barcode
   */
  public ean13(options: {
    position: Position;
    data: string;
    height?: Length;
    printHri?: boolean;
    printHriAbove?: boolean;
    orientation?: Orientation;
  }): this {
    return this.addField(options.position, [
      {
        type: "Ean13",
        orientation: options.orientation,
        height: this.optionalDots(options.height),
        interpretationLine: options.printHri,
        interpretationLineAbove: options.printHriAbove,
      },
      ...this.fieldData(options.data),
    ]);
  }

  /**
   * Draw a Data Matrix code on the label
   * @param options.position Position (x, y) of the code
   * @param options.data Data to encode
   * @param options.moduleSize Size of each square module
   * @param options.orientation Orientation of the code - defaults to normal
   * @param options.quality Error correction level - defaults to 200 (ECC 200)
   * @param options.columns Number of columns to encode
   * @param options.rows Number of rows to encode
   * @param options.formatId Format ID, not used with quality 200
   * @param options.escapeCharacter Escape sequence control character
   */
  public dataMatrix(options: {
    position: Position;
    data: string;
    moduleSize: Length;
    orientation?: Orientation;
    quality?: 0 | 50 | 80 | 100 | 140 | 200;
    columns?: number;
    rows?: number;
    formatId?: 1 | 2 | 3 | 4 | 5 | 6;
    escapeCharacter?: string;
  }): this {
    return this.addField(options.position, [
      {
        type: "DataMatrix",
        orientation: options.orientation ?? Orientation.Normal,
        height: this.dots(options.moduleSize),
        quality: options.quality ?? 200,
        columns: options.columns,
        rows: options.rows,
        formatId: options.formatId,
        escapeCharacter: options.escapeCharacter,
      },
      ...this.fieldData(options.data),
    ]);
  }

  /**
   * Draw a QR code on the label. The data is escaped, and the error
   * correction level is added to it as ZPL requires.
   * @param options.position Position (x, y) of the code
   * @param options.data Data to encode
   * @param options.moduleSize Size of each square module - defaults to the printer's default for its resolution
   * @param options.errorCorrection H (highest), Q, M (standard) or L (densest) - defaults to M
   */
  public qrCode(options: {
    position: Position;
    data: string;
    moduleSize?: Length;
    errorCorrection?: "H" | "Q" | "M" | "L";
  }): this {
    const { errorCorrection = "M" } = options;

    return this.addField(options.position, [
      {
        type: "QrCode",
        orientation: "N",
        model: 2,
        magnification: this.optionalDots(options.moduleSize),
      },
      // A for automatic input: the printer picks the encoding
      ...this.fieldData(`${errorCorrection}A,${options.data}`),
    ]);
  }

  /**
   * Draw a field with any command, for elements without their own method.
   * The command is added as written; the data is escaped.
   * @param options.position Position (x, y) of the field
   * @param options.command ZPL command(s) for the field, e.g. "^B3N,N,100,Y,N"
   * @param options.data Field data, if the command needs any
   */
  public field(options: {
    position: Position;
    command: `${"^" | "~"}${string}`;
    data?: string;
  }): this {
    const { position, command, data } = options;

    if (!/^[\^~]/.test(command)) {
      throw new ZplError(`Commands start with ^ or ~, got: ${command}`);
    }

    return this.addField(position, [
      { type: "Raw", zpl: command },
      ...(data === undefined ? [] : this.fieldData(data)),
    ]);
  }

  /**
   * @returns The generated ZPL, closed with ^XZ if it is not already
   */
  public toZPL(): string {
    return serialize(this.closedCommands(), { minify: this.minify });
  }

  /**
   * Find problems the printer would not report, such as values it silently
   * changes. Checks the label as toZPL() outputs it.
   */
  public lint(): LintDiagnostic[] {
    return lint(this.closedCommands());
  }

  /** The commands, ending with ^XZ */
  private closedCommands(): Command[] {
    const last = this.nodes[this.nodes.length - 1];

    return last?.type === "EndFormat"
      ? this.nodes
      : [...this.nodes, { type: "EndFormat" }];
  }

  /**
   * Validate the generated ZPL
   * @param strict Whether to throw an error if using an unknown ZPL command. Set to `false` if you want to use commands that are not yet supported in this library.
   */
  public validate(strict = true): void {
    super.validate(strict);

    const count = (type: Command["type"], pattern: RegExp): number =>
      this.nodes.reduce(
        (total, node) =>
          total +
          (node.type === type
            ? 1
            : node.type === "Raw"
            ? (node.zpl.match(pattern) ?? []).length
            : 0),
        0
      );
    const opened =
      count("FieldOrigin", /\^FO/g) + count("FieldTypeset", /\^FT/g);
    const closed = count("FieldSeparator", /\^FS/g);

    if (opened !== closed) {
      throw new ZplError(
        `Label opens ${opened} fields (^FO/^FT) but closes ${closed} (^FS).`
      );
    }
  }
}

export default Label;
