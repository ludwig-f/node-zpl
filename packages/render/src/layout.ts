/**
 * Turns parsed ZPL commands into elements to draw, by replaying them the way
 * a printer does: label home, field positions, reverse printing and stored
 * graphics carry over between commands. Each element records the commands
 * that produced it, so a drawn element can be traced back to its source.
 */
import { decodeGraphicData } from "./graphics.js";
import type { Command } from "node-zpl";

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

type Field = {
  x: number;
  y: number;
  /** ^FT positions the bottom-left corner instead of the top-left */
  fromBottom: boolean;
  reverse: boolean;
  commands: number[];
  elements: Element[];
};

const newField = (): Field => ({
  x: 0,
  y: 0,
  fromBottom: false,
  reverse: false,
  commands: [],
  elements: [],
});

/** Commands that draw something we don't render yet */
const notYetDrawn = new Set<Command["type"]>([
  "FieldData",
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

  const add = (element: Element, height: number) => {
    if (field.fromBottom) element.y -= height;
    field.elements.push(element);
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
      field = newField();
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
        break;
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
        if (notYetDrawn.has(command.type)) label.unsupported.push(index);
    }
  });

  return labels;
};

export type { Element, LabelLayout };
export { layout };
