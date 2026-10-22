/**
 * Turns parsed ZPL commands into elements to draw, by replaying them the way
 * a printer does: label home, field positions, reverse printing and stored
 * graphics carry over between commands. Each element records the commands
 * that produced it, so a drawn element can be traced back to its source.
 */
import { decodeGraphicData } from "./graphics.js";
import type { Command } from "node-zpl";
import type { Orientation, TextBlockOptions } from "./text.js";

type Common = {
  x: number;
  y: number;
  /** Inverts what's underneath instead of drawing over it */
  reverse: boolean;
  /** Indices of the commands that produced the element */
  commands: number[];
};

type Element = Common &
  (
    | {
        kind: "box";
        width: number;
        height: number;
        thickness: number;
        color: "B" | "W";
        rounding: number;
      }
    | { kind: "circle"; diameter: number; thickness: number; color: "B" | "W" }
    | {
        kind: "diagonal";
        width: number;
        height: number;
        thickness: number;
        color: "B" | "W";
        direction: "R" | "L";
      }
    | {
        kind: "text";
        text: string;
        /** Font name: 0, A to Z or 1 to 9 */
        font: string;
        /** Character height and width in dots, as given (see FontSetting) */
        height?: number;
        width?: number;
        orientation: Orientation;
        /** ^FT positions the baseline instead of the top */
        fromBottom: boolean;
        /** ^FB wraps the text in a block */
        block?: TextBlockOptions;
      }
    | {
        kind: "bitmap";
        /** Packed rows of bits, most significant bit first */
        bytes: Uint8Array;
        bytesPerRow: number;
        rows: number;
        magnificationX: number;
        magnificationY: number;
      }
  );

type LabelLayout = {
  printWidth?: number;
  elements: Element[];
  /** Commands that were understood but aren't drawn yet */
  unsupported: number[];
};

type StoredGraphic = { bytes: Uint8Array; bytesPerRow: number; rows: number };

type FontSetting = {
  font: string;
  /**
   * Height and width as given, in dots. Either may be missing: how a missing
   * one is filled in depends on the font, so it's resolved when drawing.
   */
  height?: number;
  width?: number;
  /** Missing when ^A doesn't give one: the field then uses ^FW's */
  orientation?: Orientation;
};

type Field = {
  x: number;
  y: number;
  /** ^FT positions the bottom-left corner instead of the top-left */
  fromBottom: boolean;
  reverse: boolean;
  /** Font set with ^A for this field only */
  font?: FontSetting;
  /** ^FH: the character that starts a hex escape in the field data */
  hexIndicator?: string;
  block?: TextBlockOptions;
  commands: number[];
};

const newField = (): Field => ({
  x: 0,
  y: 0,
  fromBottom: false,
  reverse: false,
  commands: [],
});

/** Font settings at power-up: font A, 9 dots high, 5 wide */
const initialFont: FontSetting = { font: "A", height: 9, width: 5 };

/**
 * Field data as text: hex escapes become bytes, and with ^CI28 to 30 the
 * bytes are UTF-8. Other character sets are read as Latin-1.
 */
const decodeFieldData = (
  data: string,
  hexIndicator: string | undefined,
  utf8: boolean
): string => {
  if (hexIndicator === undefined) return data;

  const bytes: number[] = [];
  const encoder = new TextEncoder();
  for (let i = 0; i < data.length; i++) {
    const hex = data.slice(i + 1, i + 3);
    if (data[i] === hexIndicator && /^[0-9A-Fa-f]{2}$/.test(hex)) {
      bytes.push(parseInt(hex, 16));
      i += 2;
    } else if (utf8) {
      bytes.push(...encoder.encode(data[i]));
    } else {
      bytes.push(data.charCodeAt(i) & 0xff);
    }
  }
  return utf8
    ? new TextDecoder().decode(new Uint8Array(bytes))
    : String.fromCharCode(...bytes);
};

/** Commands that draw something we don't render yet */
const notYetDrawn = new Set<Command["type"]>([
  "Code11",
  "Code128",
  "Ean13",
  "DataMatrix",
  "QrCode",
]);

const layout = (commands: readonly Command[]): LabelLayout[] => {
  const labels: LabelLayout[] = [];
  const stored = new Map<string, StoredGraphic>();
  let label: LabelLayout | undefined;
  let home = { x: 0, y: 0 };
  let labelReverse = false;
  let field = newField();

  let defaultFont = initialFont;
  let orientation: Orientation = "N";
  let utf8 = false;
  let barcode = false;

  const add = (element: Element, height: number) => {
    if (field.fromBottom) element.y -= height;
    label?.elements.push(element);
  };

  commands.forEach((command, index) => {
    if (command.type === "DownloadGraphic") {
      stored.set(`${command.device}:${command.name}`, {
        bytes: decodeGraphicData(
          command.data,
          command.bytesPerRow,
          command.totalBytes
        ),
        bytesPerRow: command.bytesPerRow,
        rows: Math.ceil(command.totalBytes / command.bytesPerRow),
      });
      return;
    }

    if (command.type === "StartFormat") {
      label = { elements: [], unsupported: [] };
      labels.push(label);
      home = { x: 0, y: 0 };
      labelReverse = false;
      defaultFont = initialFont;
      orientation = "N";
      utf8 = false;
      field = newField();
      barcode = false;
      return;
    }
    if (!label) return;

    field.commands.push(index);
    const common = (): Common => ({
      x: field.x,
      y: field.y,
      reverse: field.reverse || labelReverse,
      commands: field.commands,
    });

    switch (command.type) {
      case "EndFormat":
        label = undefined;
        break;
      case "PrintWidth":
        label.printWidth = command.width;
        break;
      case "LabelHome":
        home = { x: command.x, y: command.y };
        break;
      case "LabelReverse":
        labelReverse = command.reverse;
        break;
      case "FieldOrigin":
        field = {
          ...newField(),
          x: home.x + command.x,
          y: home.y + command.y,
          commands: [index],
        };
        break;
      case "FieldTypeset":
        field = {
          ...newField(),
          x: home.x + (command.x ?? 0),
          y: home.y + (command.y ?? 0),
          fromBottom: true,
          commands: [index],
        };
        break;
      case "FieldReverse":
        field.reverse = true;
        break;
      case "FieldSeparator":
        field = newField();
        barcode = false;
        break;
      case "ChangeEncoding":
        utf8 = command.charset >= 28 && command.charset <= 30;
        break;
      case "DefaultFont": {
        // Sizes that aren't given keep their previous values
        const sized =
          command.height !== undefined || command.width !== undefined;
        defaultFont = {
          ...defaultFont,
          font: command.font,
          height: sized ? command.height : defaultFont.height,
          width: sized ? command.width : defaultFont.width,
        };
        break;
      }
      case "Font": {
        // Without a size, the field uses the default font's size
        const sized =
          command.height !== undefined || command.width !== undefined;
        field.font = {
          font: command.font,
          height: sized ? command.height : defaultFont.height,
          width: sized ? command.width : defaultFont.width,
          orientation: command.orientation,
        };
        break;
      }
      case "FieldOrientation":
        orientation = command.orientation;
        break;
      case "FieldBlock":
        field.block = {
          width: command.width,
          maxLines: Math.max(1, command.maxLines ?? 1),
          lineSpacing: command.lineSpacing ?? 0,
          justification: command.justification ?? "L",
          hangingIndent: command.hangingIndent ?? 0,
        };
        break;
      case "FieldHexIndicator":
        field.hexIndicator = command.indicator ?? "_";
        break;
      case "FieldData": {
        // Field data under a barcode is drawn by the barcode
        if (barcode) {
          label.unsupported.push(index);
          break;
        }
        const font = field.font ?? defaultFont;
        label.elements.push({
          ...common(),
          kind: "text",
          text: decodeFieldData(command.data, field.hexIndicator, utf8),
          font: font.font,
          height: font.height,
          width: font.width,
          orientation: font.orientation ?? orientation,
          fromBottom: field.fromBottom,
          block: field.block,
        });
        break;
      }
      case "GraphicBox": {
        const thickness = command.thickness ?? 1;
        const width = Math.max(command.width ?? thickness, thickness);
        const height = Math.max(command.height ?? thickness, thickness);
        add(
          {
            ...common(),
            kind: "box",
            width,
            height,
            thickness,
            color: command.color ?? "B",
            rounding: command.rounding ?? 0,
          },
          height
        );
        break;
      }
      case "GraphicCircle": {
        const diameter = command.diameter ?? 3;
        add(
          {
            ...common(),
            kind: "circle",
            diameter,
            thickness: command.thickness ?? 1,
            color: command.color ?? "B",
          },
          diameter
        );
        break;
      }
      case "GraphicDiagonal": {
        const thickness = command.thickness ?? 1;
        const height = command.height ?? Math.max(thickness, 3);
        add(
          {
            ...common(),
            kind: "diagonal",
            width: command.width ?? Math.max(thickness, 3),
            height,
            thickness,
            color: command.color ?? "B",
            direction: command.direction ?? "R",
          },
          height
        );
        break;
      }
      case "GraphicField": {
        const rows = Math.ceil(command.fieldCount / command.bytesPerRow);
        add(
          {
            ...common(),
            kind: "bitmap",
            bytes: decodeGraphicData(
              command.data,
              command.bytesPerRow,
              command.fieldCount
            ),
            bytesPerRow: command.bytesPerRow,
            rows,
            magnificationX: 1,
            magnificationY: 1,
          },
          rows
        );
        break;
      }
      case "RecallGraphic": {
        const graphic = stored.get(`${command.device}:${command.name}`);
        if (!graphic) break;
        const magnificationY = command.magnificationY ?? 1;
        add(
          {
            ...common(),
            kind: "bitmap",
            ...graphic,
            magnificationX: command.magnificationX ?? 1,
            magnificationY,
          },
          graphic.rows * magnificationY
        );
        break;
      }
      default:
        if (notYetDrawn.has(command.type)) {
          label.unsupported.push(index);
          barcode = true;
        }
    }
  });

  return labels;
};

export type { Element, LabelLayout };
export { layout };
