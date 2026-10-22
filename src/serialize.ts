import ZplError from "./ZplError.js";
import type { Command } from "./ast.js";

type Param = string | number | boolean | undefined;

const yn = (value: boolean | undefined): string | undefined =>
  value === undefined ? undefined : value ? "Y" : "N";

/**
 * Join parameters with commas. Trailing undefined parameters are dropped and
 * inner ones are left empty, so the printer falls back to their defaults.
 */
const params = (...values: Param[]): string => {
  const strings = values.map((value) =>
    value === undefined ? "" : String(value)
  );

  while (strings.length > 0 && strings[strings.length - 1] === "") {
    strings.pop();
  }

  return strings.join(",");
};

const assertNoPrefix = (text: string, what: string): string => {
  if (/[\^~]/.test(text)) {
    throw new ZplError(
      `${what} cannot contain ^ or ~, escape them with ^FH: ${text}`
    );
  }

  return text;
};

/**
 * Serialize a single command node to ZPL
 */
const serializeCommand = (command: Command): string => {
  switch (command.type) {
    case "StartFormat":
      return "^XA";
    case "EndFormat":
      return "^XZ";
    case "PrintWidth":
      return `^PW${command.width}`;
    case "LabelLength":
      return `^LL${command.length}`;
    case "LabelHome":
      return `^LH${params(command.x, command.y)}`;
    case "LabelReverse":
      return `^LR${yn(command.reverse)}`;
    case "ChangeEncoding":
      return `^CI${command.charset}`;
    case "DefaultFont":
      return `^CF${params(command.font, command.height, command.width)}`;
    case "FieldOrigin":
      return `^FO${params(command.x, command.y, command.justification)}`;
    case "FieldTypeset":
      return `^FT${params(command.x, command.y, command.justification)}`;
    case "Font":
      // Font name and orientation are not separated by a comma
      return `^A${params(
        `${command.font}${command.orientation ?? ""}`,
        command.height,
        command.width
      )}`;
    case "FieldBlock":
      return `^FB${params(
        command.width,
        command.maxLines,
        command.lineSpacing,
        command.justification,
        command.hangingIndent
      )}`;
    case "FieldReverse":
      return "^FR";
    case "FieldHexIndicator":
      return `^FH${command.indicator ?? ""}`;
    case "FieldData":
      return `^FD${assertNoPrefix(command.data, "Field data")}`;
    case "FieldSeparator":
      return "^FS";
    case "Comment":
      return `^FX${assertNoPrefix(command.text, "Comment")}`;
    case "GraphicBox":
      return `^GB${params(
        command.width,
        command.height,
        command.thickness,
        command.color,
        command.rounding
      )}`;
    case "GraphicCircle":
      return `^GC${params(command.diameter, command.thickness, command.color)}`;
    case "GraphicDiagonal":
      return `^GD${params(
        command.width,
        command.height,
        command.thickness,
        command.color,
        command.direction
      )}`;
    case "GraphicField":
      return `^GFA,${params(
        command.byteCount,
        command.fieldCount,
        command.bytesPerRow,
        command.data
      )}`;
    case "RecallGraphic":
      return `^XG${params(
        `${command.device}:${command.name}.GRF`,
        command.magnificationX,
        command.magnificationY
      )}`;
    case "BarcodeDefaults":
      return `^BY${params(command.moduleWidth, command.ratio, command.height)}`;
    case "Code11":
      return `^B1${params(
        command.orientation,
        command.checkDigits === undefined
          ? undefined
          : yn(command.checkDigits === 1),
        command.height,
        yn(command.interpretationLine),
        yn(command.interpretationLineAbove)
      )}`;
    case "Code128":
      return `^BC${params(
        command.orientation,
        command.height,
        yn(command.interpretationLine),
        yn(command.interpretationLineAbove),
        yn(command.uccCheckDigit),
        command.mode
      )}`;
    case "Ean13":
      return `^BE${params(
        command.orientation,
        command.height,
        yn(command.interpretationLine),
        yn(command.interpretationLineAbove)
      )}`;
    case "DataMatrix":
      return `^BX${params(
        command.orientation,
        command.height,
        command.quality,
        command.columns,
        command.rows,
        command.formatId,
        command.escapeCharacter
      )}`;
    case "SetDarkness":
      return `~SD${String(command.darkness).padStart(2, "0")}`;
    case "DownloadGraphic":
      return `~DG${params(
        `${command.device}:${command.name}.GRF`,
        command.totalBytes,
        command.bytesPerRow,
        command.data
      )}`;
    case "DeleteObject":
      return `^ID${command.device}:${command.name}.${command.extension}`;
    case "Raw":
      return command.zpl;
  }
};

/**
 * Serialize a list of command nodes to ZPL
 * @param commands Commands to serialize
 * @param options.minify Whether to put each command on its own line - defaults to true
 */
const serialize = (
  commands: Command[],
  options?: { minify?: boolean }
): string => {
  const minify = options?.minify ?? true;

  return commands
    .map((command) => serializeCommand(command) + (minify ? "" : "\n"))
    .join("");
};

const hex = (char: string): string =>
  `_${char.charCodeAt(0).toString(16).toUpperCase()}`;

/**
 * Escape field data so it can be written in a ^FD command. Characters that
 * would otherwise be read as commands (^ and ~) and the default ^FH indicator
 * (_) are hex-encoded, which requires a ^FH command before the ^FD.
 */
const escapeFieldData = (
  data: string
): { data: string; needsHexIndicator: boolean } => {
  const escaped = data.replace(/[\^~_]/g, hex);

  return { data: escaped, needsHexIndicator: escaped !== data };
};

export { serialize, serializeCommand, escapeFieldData };
