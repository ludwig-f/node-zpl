import ZplContent from "./ZplContent.js";
import ZplError from "./ZplError.js";
import { ZebraFontFamily, Orientation } from "./types.js";
import type { StoreGraphicsOptions, Position } from "./types.js";

class Label extends ZplContent {
  protected width: number;
  protected height: number;
  protected dpmm: number;
  protected reverse: boolean;
  protected characterSet: string;
  protected home: { x: number; y: number };
  protected zpl: string;
  protected minify: boolean;

  /**
   * Construct a new label
   * @param width Label width in millimeters
   * @param height Label height in millimeters
   * @param dpmm Dots per millimeter
   * @param options Additional options
   * @param options.reverse Reverse label (invert colors)
   * @param options.characterSet Character set, defaulting to "28" (UTF-8)
   */
  constructor(
    width: number,
    height: number,
    dpmm: 6 | 8 | 12 | 24,
    options?: Partial<{
      reverse: boolean;
      characterSet: string;
      home: { x: number; y: number };
      minify: boolean;
    }>
  ) {
    super();
    this.width = width;
    this.height = height;
    this.dpmm = dpmm;
    this.reverse = options?.reverse ?? false;
    this.characterSet = options?.characterSet ?? "28";
    this.home = options?.home ?? { x: 0, y: 0 };
    this.minify = options?.minify ?? true;

    this.zpl = "";

    this.open();
    this.setLabelSize(width, height);
    this.setLabelReverse(this.reverse);
    this.setCharacterSet(this.characterSet);
    this.setHome(this.home.x, this.home.y);

    if (this.reverse) {
      // Draw a black box over the entire label to invert the colors
      this.drawBox({
        position: { x: 0, y: 0 },
        width: this.width,
        height: this.height,
        thickness: this.width * this.dpmm,
      });
    }
  }

  /**
   * Write a ZPL command
   * @param command Complete ZPL command to write
   */
  private command(command: string): Label {
    this.zpl += `${command}${this.minify ? "" : "\n"}`;

    return this;
  }

  /**
   * Manually open label
   */
  public open(): Label {
    return this.command("^XA");
  }

  /**
   * Close the label
   */
  public close(): Label {
    return this.command("^XZ");
  }

  /**
   * Set the size of the label
   * @param width Width of the label in millimeters
   * @param height Height of the label in millimeters
   */
  public setLabelSize(width: number, height: number): Label {
    this.command(`^PW${width * this.dpmm}`);
    this.command(`^LL${height * this.dpmm}`);

    return this;
  }

  /**
   * Set label reverse policy for all fields
   * @param reverse Whether to reverse the label
   */
  public setLabelReverse(reverse: boolean): Label {
    return this.command(`^LR${reverse ? "Y" : "N"}`);
  }

  /**
   * Set character set of the label
   * @param characterSet Character set identifier
   */
  public setCharacterSet(characterSet: string): Label {
    return this.command(`^CI${characterSet}`);
  }

  /**
   * Set the default font of the label
   * @param width Character width in dots
   * @param height Character height in dots
   * @param fontFamily Font family to use, either a custom font or one of the built-in Zebra fonts
   */
  public setDefaultFont(
    width: number,
    height: number,
    fontFamily: ZebraFontFamily | string
  ): Label {
    return this.command(`^CF${fontFamily},${width},${height}`);
  }

  /**
   * Set the home position of the label
   * @param x X coordinate
   * @param y Y coordinate
   */
  private setHome(x: number, y: number): Label {
    return this.command(`^LH${x},${y}`);
  }

  /**
   * Start new field at the given position
   * @param x X coordinate
   * @param y Y coordinate
   */
  public startField(x: number, y: number): Label {
    return this.command(`^FO${x},${y}`);
  }

  /**
   * End the current field
   */
  public endField(): Label {
    return this.command("^FS");
  }

  /**
   * Draw a box on the label
   * @param options.position Position (x, y) of the box
   * @param options.width Width of the box in millimeters
   * @param options.height Height of the box in millimeters
   * @param options.thickness Thickness of the box in dots
   */
  public drawBox(options: {
    position: Position;
    width: number;
    height: number;
    thickness: number;
    rounding?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  }): Label {
    const { position, width, height, thickness, rounding = 0 } = options;
    const wDots = width * this.dpmm;
    const hDots = height * this.dpmm;
    const color = this.reverse ? "B" : "W";

    this.startField(position.x, position.y);
    this.command(`^GB${wDots},${hDots},${thickness},${color},${rounding}`);
    this.endField();

    return this;
  }

  /**
   * Recall stored graphic and draw it on the label
   * @param options
   * @param options.position Position (x, y) of the graphic
   * @param options.name Name of the graphic
   * @param options.device Device where the graphic is stored
   * @param options.magnification Magnification of the graphic
   */
  public drawStoredGraphic(options: {
    position: Position;
    name: string;
    device?: StoreGraphicsOptions["device"];
    magnification?: { x: number; y: number };
  }): Label {
    const {
      position,
      name,
      device = "R",
      magnification = { x: 1, y: 1 },
    } = options;
    this.startField(position.x, position.y);
    this.command(
      `^XG${device}:${name}.GRF,${magnification.x},${magnification.y}`
    );
    this.endField();

    return this;
  }

  /**
   * Draw an image on the label
   * @param options
   * @param options.position Position (x, y) of the image
   * @param options.totalBytes Total bytes of the image
   * @param options.bytesPerRow Bytes per row of the image
   * @param options.data Data of the image
   */
  public drawImage(options: {
    position: Position;
    totalBytes: number;
    bytesPerRow: number;
    data: string;
  }): Label {
    const { position, totalBytes, bytesPerRow, data } = options;
    this.startField(position.x, position.y);
    this.command(`^GFA,${totalBytes},${totalBytes},${bytesPerRow},${data}`);
    this.endField();

    return this;
  }

  /**
   * Draw text on the label
   * @param options
   * @params options.text Text to draw
   * @params options.position Position (x, y) of the text
   * @params options.font Font family
   * @params options.charHeight Character height
   * @params options.charWidth Character width
   * @params options.orientation Orientation of the text
   */
  public drawText(options: {
    text: string;
    position: Position;
    font: ZebraFontFamily | string;
    charHeight: number;
    charWidth: number;
    orientation?: Orientation;
  }): Label {
    const {
      position,
      font = ZebraFontFamily.A,
      charHeight,
      charWidth,
      text,
      orientation = Orientation.Normal,
    } = options;
    this.startField(position.x, position.y);
    this.command(`^A${font}${orientation},${charHeight},${charWidth}`);
    this.command(`^FD${text}`);
    this.endField();

    return this;
  }

  /**
   * Draw a Code 11 barcode on the label
   * @param options.position Position (x, y) of the barcode
   * @param options.data Data to encode
   * @param options.charHeight Height of the barcode
   * @param options.checkDigits Number of check digits
   * @param options.orientation Orientation of the barcode
   * @param options.printHri Whether to print the human readable interpretation
   * @param options.printHriAbove Whether to print the human readable interpretation above the barcode
   * @returns
   */
  public drawCode11(options: {
    position: Position;
    data: string;
    charHeight: number;
    checkDigits?: 1 | 2;
    orientation?: Orientation;
    printHri?: boolean;
    printHriAbove?: boolean;
  }): Label {
    const {
      position,
      data,
      charHeight,
      checkDigits = 1,
      orientation = Orientation.Normal,
      printHri = true,
      printHriAbove = false,
    } = options;
    const digits = checkDigits === 1 ? "Y" : "N";
    const height = charHeight * this.dpmm;
    const hri = printHri ? "Y" : "N";
    const hriAbove = printHriAbove ? "Y" : "N";
    this.startField(position.x, position.y);
    this.command(`^B1${orientation},${digits},${height},${hri},${hriAbove}`);
    this.command(`^FD${data}`);
    this.endField();

    return this;
  }

  /**
   * Draw a Code 128 barcode on the label
   * @param options.position Position (x, y) of the barcode
   * @param options.data Data to encode
   * @param options.charHeight Height of the barcode
   * @param options.orientation Orientation of the barcode
   * @param options.printHri Whether to print the human readable interpretation
   * @param options.printHriAbove Whether to print the human readable interpretation above the barcode
   * @param options.useUcc Whether to use UCC check digit
   * @param options.mode Mode of the barcode
   * @returns
   */
  public drawCode128(options: {
    position: Position;
    data: string;
    charHeight: number;
    orientation?: Orientation;
    printHri?: boolean;
    printHriAbove?: boolean;
    useUcc?: boolean;
    mode?: "N" | "U" | "D" | "A";
  }): Label {
    const {
      position,
      data,
      charHeight: height,
      orientation = Orientation.Normal,
      printHri = true,
      printHriAbove = false,
      useUcc = false,
      mode = "N",
    } = options;
    const hDots = height * this.dpmm;
    const hri = printHri ? "Y" : "N";
    const hriAbove = printHriAbove ? "Y" : "N";
    const ucc = useUcc ? "Y" : "N";
    this.startField(position.x, position.y);
    this.command(
      `^BC${orientation},${hDots},${hri},${hriAbove},${ucc},${mode}`
    );
    this.command(`^FD${data}`);
    this.endField();

    return this;
  }

  /**
   * Draw an EAN13 barcode on the label
   * @param options
   * @param options.position Position (x, y) of the barcode
   * @param options.data Data to encode
   * @param options.height Height of the barcode in millimeters
   * @param options.printHri Whether to print the human readable interpretation
   * @param options.printHriAbove Whether to print the human readable interpretation above the barcode
   * @param options.orientation Orientation of the barcode
   */
  public drawEAN13(options: {
    position: Position;
    data: string;
    height: number;
    printHri?: boolean;
    printHriAbove?: boolean;
    orientation?: Orientation;
  }): Label {
    const {
      position,
      data,
      height,
      printHri = true,
      printHriAbove = false,
      orientation = Orientation.Normal,
    } = options;
    const hDots = height * this.dpmm;
    const hri = printHri ? "Y" : "N";
    const hriAbove = printHriAbove ? "Y" : "N";

    this.startField(position.x, position.y);
    this.command(`^BE${orientation},${hDots},${hri},${hriAbove}`);
    this.command(`^FD${data}`);
    this.endField();

    return this;
  }

  /**
   * Draw a DataMatrix code on the label
   * @param options.position Position (x, y) of the code
   * @param options.data Data to encode
   * @param options.height Height of the code
   * @param options.orientation Orientation of the code
   * @param options.quality Quality of the code
   * @param options.columnsToEncode Number of columns to encode
   * @param options.rowsToEncode Number of rows to encode
   * @param options.formatId Format ID of the code
   * @param options.escapeSequenceControlCharacter Escape sequence control character
   */
  public drawDataMatrix(options: {
    position: Position;
    data: string;
    height: number;
    orientation?: Orientation;
    quality?: 0 | 50 | 80 | 100 | 140 | 200;
    columnsToEncode?: number;
    rowsToEncode?: number;
    formatId?: 1 | 2 | 3 | 4 | 5 | 6;
    escapeSequenceControlCharacter?: string;
  }): Label {
    const {
      position,
      data,
      orientation = Orientation.Normal,
      height,
      quality = 200,
      columnsToEncode,
      rowsToEncode,
      formatId,
      escapeSequenceControlCharacter,
    } = options;
    this.startField(position.x, position.y);
    let cmd = `^BX${orientation},${height},${quality}`;

    if (columnsToEncode) {
      cmd += `,${columnsToEncode}`;
    }

    if (rowsToEncode) {
      cmd += `,${rowsToEncode}`;
    }

    if (formatId) {
      cmd += `,${formatId}`;
    }

    if (escapeSequenceControlCharacter) {
      cmd += `,${escapeSequenceControlCharacter}`;
    }

    this.command(cmd);
    this.command(`^FD${data}`);
    this.endField();

    return this;
  }

  public toZPL(): string {
    this.zpl = super.toZPL();

    if (!this.zpl.endsWith("^XZ")) {
      this.close();
    }

    return this.zpl;
  }

  /**
   * Validate the generated ZPL
   * @param strict Whether to throw an error if using an unknown ZPL command. Set to `false` if you want to use commands that are not yet supported in this library.
   */
  public validate(strict = true): void {
    super.validate(strict);

    if (!this.zpl.startsWith("^XA")) {
      throw new ZplError("Unexpected start of label. Missing ^XA?");
    }

    if (!this.zpl.endsWith("^XZ")) {
      throw new ZplError(
        "Unexpected end of label. Did you forget to close label?"
      );
    }

    // should have as many ^FO as ^FS
    const fieldOpenCount = (this.zpl.match(/\^FO/g) || []).length;
    const fieldCloseCount = (this.zpl.match(/\^FS/g) || []).length;

    if (fieldOpenCount !== fieldCloseCount) {
      throw new Error(
        `Label has ${fieldOpenCount} ^FO but ${fieldCloseCount} ^FS.`
      );
    }
  }
}

export default Label;
