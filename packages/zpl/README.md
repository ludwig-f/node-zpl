# node-zpl

`node-zpl` is a ZPL (Zebra Programming Language) generator for TypeScript.

This library provides a thin (but typed!) wrapper around the ZPL commands as described by Zebra.

> [!NOTE]
> This library is under active development and does not yet support every single ZPL command. Please check the list below to see the currently supported commands. Contributions are welcome!

## Installation

Install `node-zpl` using the package manager of your choice. Using `npm`:

```bash
npm install node-zpl
```

`node-zpl` is an ES module and needs Node 22 or newer. CommonJS projects can still load it with `require()`, which Node supports for ES modules since 22.12.

## Usage

Here's a basic example of how to use `node-zpl` to generate a label with some text and an EAN-13 bar code:

```typescript
import { Label, Orientation, mm, dots } from "node-zpl";

const zpl = new Label({ width: mm(57), height: mm(19), dpmm: 12 })
  .drawText({
    position: { x: mm(2), y: mm(2) },
    text: "Hello ^ world",
    font: { height: mm(4) },
  })
  .drawEAN13({
    position: { x: mm(2), y: mm(8) },
    data: "123456789012",
    height: mm(7),
    orientation: Orientation.Normal,
  })
  .toZPL();
```

> [!TIP]
> To preview your generated ZPL you can use [Labelary](https://labelary.com/viewer.html)!

### JSX

Labels can also be written as JSX. It compiles to the same commands as the builder, so everything else in this README applies. Set up TypeScript (or your bundler) to use `node-zpl` as the JSX runtime:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "node-zpl"
  }
}
```

```tsx
import { Label, Text, Box, Code128, build, mm, dots } from "node-zpl/jsx";
import type { Length } from "node-zpl";

const order = { id: 10442, barcode: "10442-B3", express: true };

const ReturnAddress = (props: { x: Length; y: Length }) => (
  <Text x={props.x} y={props.y} height={mm(3)}>Harbor Parts Co.</Text>
);

const zpl = build(
  <Label width={mm(101.6)} height={mm(50.8)} dpmm={8}>
    <ReturnAddress x={mm(5)} y={mm(5)} />
    <Text x={mm(5)} y={mm(14)} height={mm(4)}>
      Order #{order.id}
    </Text>
    <Box x={mm(5)} y={mm(21)} width={mm(91)} height={dots(3)} thickness={dots(3)} />
    <Code128 x={mm(5)} y={mm(25)} height={mm(13)}>{order.barcode}</Code128>
    {order.express && <Text x={mm(70)} y={mm(5)} height={mm(7)}>EXPRESS</Text>}
  </Label>
).toZPL();
```

`build()` returns the same `Label` object as the builder API, with `toZPL()`, `validate()` and `commands`. Text and barcode data go in children, `false`, `null` and `undefined` children are skipped, and lists from `.map()` work as you'd expect. Elements can be reused across labels with different resolutions, since millimeters are converted when the label is built.

#### In React projects

No setup is needed: label elements also work when compiled by React's JSX runtime, so labels can live next to your React components and use the same JSX settings. Components that return a `<Label>` can be passed to `build()` directly:

```tsx
const ShippingLabel = ({ order }: { order: Order }) => (
  <Label width={mm(50)} height={mm(25)} dpmm={8}>
    <Text x={mm(2)} y={mm(2)} height={mm(4)}>Order {order.id}</Text>
  </Label>
);

const zpl = build(<ShippingLabel order={order} />).toZPL();
```

Label components are plain functions that `build()` calls, not React components, so hooks and React context don't work inside them, and a `<Label>` can't be rendered into a React page.

### Units

Every length takes an explicit unit: `mm(10)` for millimeters or `dots(80)` for printer dots, ZPL's native unit. Millimeters are converted to dots using the label's `dpmm` (dots per millimeter: 6, 8, 12 or 24 for 152, 203, 300 or 600 dpi printers). Passing a bare number is a type error, so mixing up units can't happen by accident.

### Escaping

Field data such as text and bar code contents is escaped automatically. Characters that ZPL would otherwise read as commands (`^` and `~`) are hex-encoded using `^FH`, so user input can't break the label.

### Fields with any command

Elements without their own method can be drawn with `drawField`, which wraps any command in a field and escapes its data:

```typescript
label.drawField({ position: { x: mm(2), y: mm(2) }, command: "^B3N,N,100,Y,N", data: "ABC-123" });
```

### Commands as data

Labels are built from typed command nodes, which you can inspect with `label.commands`. Commands that have no builder method yet can be added as nodes with `label.add(...)`, or as raw ZPL with `label.raw(...)`:

```typescript
label.add({ type: "GraphicCircle", diameter: 80, thickness: 4 });
label.raw("^PQ2"); // print two copies
```

### Parsing ZPL

`parse` reads existing ZPL into the same command nodes, so you can inspect, check or modify labels you didn't build with `node-zpl`:

```typescript
import { parse, serialize } from "node-zpl";

const { commands, diagnostics } = parse("^XA^FO50,50^A0N,30^FDHello^FS^XZ");
// commands: [{ type: "StartFormat", span: { start: 0, end: 3 } }, { type: "FieldOrigin", x: 50, y: 50, ... }, ...]

serialize(commands); // "^XA^FO50,50^A0N,30^FDHello^FS^XZ"
```

- Every node has a `span` with its position in the input.
- Commands without a typed node yet are kept as `Raw` nodes, so nothing is lost.
- Commands with invalid parameters are kept as `Raw` nodes and reported in `diagnostics`.
- Prefix and delimiter changes (`^CC`, `^CT`, `^CD`) are applied while parsing, so `serialize` always writes standard `^`, `~` and `,`.

### Linting

Printers don't report mistakes. They quietly clamp values, ignore commands or never print a label. `lint` finds these problems before you print:

```typescript
import { parse, lint } from "node-zpl";

lint(parse("^XA^FO10,10^GB1,64,2^FS^FO40,40^BE^FD123^FS").commands);
// [
//   { rule: "box-smaller-than-line", severity: "warning", index: 2, span: { start: 11, end: 20 },
//     message: "The box is 1 dot wide but its line is 2 dots thick, so the printer widens it to 2 dots." },
//   { rule: "ean13-data", severity: "warning", ... },
//   { rule: "missing-end-format", severity: "error", ... },
// ]
```

Labels built with `Label` or JSX can be checked with `label.lint()`. Pass the media size in dots, `lint(commands, { width: 812, length: 406 })`, to also check labels that don't set `^PW` and `^LL`.

| Rule | Severity | Finds |
| --- | --- | --- |
| `missing-start-format` | error | Commands before the first `^XA` |
| `missing-end-format` | error | A label that never ends with `^XZ` |
| `unclosed-field` | error | A field without `^FS` |
| `command-outside-format` | warning | Commands between `^XZ` and the next `^XA` |
| `separator-without-field` | warning | `^FS` without `^FO` or `^FT` |
| `field-outside-label` | warning | Fields that start outside the label |
| `box-smaller-than-line` | warning | Boxes narrower or shorter than their line |
| `value-out-of-range` | warning | Values outside what the printer accepts |
| `ean13-data` | warning | EAN-13 data that isn't 12 digits |
| `barcode-without-data` | warning | Barcodes without `^FD` |
| `unknown-command` | warning | Commands that don't exist in ZPL |

### Images

You can convert an image to a ZPL graphic using `ImageConverter`. It depends on [jimp](https://github.com/jimp-dev/jimp) and only runs in Node, so it has its own entry point:

```typescript
import { Label, mm, dots } from "node-zpl";
import { ImageConverter } from "node-zpl/image";
import { readFileSync } from "fs";

const graphic = await new ImageConverter().toZPL(
  readFileSync("./assets/test-image.png")
);

const zpl = new Label({ width: mm(57), height: mm(19), dpmm: 12 })
  .drawGraphic({ position: { x: dots(0), y: dots(0) }, graphic })
  .toZPL();
```

### Supported ZPL Commands

- [x] `^A` - Scalable/bitmapped font
- [ ] `^A@` - Use font name to call font
- [ ] `^B0` - Aztec bar code parameters
- [x] `^B1` - Code 11 bar code
- [ ] `^B2` - Interleaved 2 of 5 bar code
- [ ] `^B3` - Code 39 bar code
- [ ] `^B4` - Code 49 bar code
- [ ] `^B5` - Planet Code bar code
- [ ] `^B7` - PDF417 bar code
- [ ] `^B8` - EAN-8 bar code
- [ ] `^B9` - UPC-E bar code
- [ ] `^BA` - Code 93 bar code
- [ ] `^BB` - CODABLOCK bar code
- [x] `^BC` - Code 128 bar code (subsets A, B, and C)
- [ ] `^BD` - UPS MaxiCode bar code
- [x] `^BE` - EAN-13 bar code
- [ ] `^BF` - MicroPDF417 bar code
- [ ] `^BI` - Industrial 2 of 5 bar code
- [ ] `^BJ` - Standard 2 of 5 bar code
- [ ] `^BK` - ANSI Codabar bar code
- [ ] `^BL` - LOGMARS bar code
- [ ] `^BM` - MSI bar code
- [ ] `^BO` - Aztec bar code
- [ ] `^BP` - Plessey bar code
- [x] `^BQ` - QR Code bar code
- [ ] `^BR` - RSS (Reduced Space Symbology) bar code
- [ ] `^BS` - UPC/EAN bar code
- [ ] `^BT` - TLC39 bar code
- [ ] `^BU` - UPC-A bar code
- [x] `^BX` - Data Matrix bar code
- [ ] `^BY` - Bar code field default
- [ ] `^BZ` - POSTNET bar code
- [ ] `^CC` - Change Caret
- [ ] `~CC` - Change Caret
- [ ] `^CD` - Change Delimiter
- [ ] `~CD` - Change Delimiter
- [x] `^CF` - Change Alphanumeric Default Font
- [x] `^CI` - Change International Font/Encoding
- [ ] `^CM` - Change Memory Letter Designation
- [ ] `^CO` - Cache On
- [ ] `^CT` - Change Tilde
- [ ] `~CT` - Change Tilde
- [ ] `^CV` - Code Validation
- [ ] `^CW` - Font Identifier
- [ ] `~DB` - Download Bitmap Font
- [ ] `~DE` - Download Encoding
- [ ] `^DF` - Download Format
- [x] `~DG` - Download Graphics
- [ ] `~DN` - Abort Download Graphics
- [ ] `~DS` - Download Intellifont (Scalable Font)
- [ ] `~DT` - Download Bounded TrueType font
- [ ] `~DU` - Download Unbounded TrueType font
- [ ] `~DY` - Download Graphics / Native TrueType or OpenType font
- [ ] `~EG` - Erase Download Graphics
- [ ] `^FB` - Field Block
- [ ] `^FC` - Field Clock (or Real Time Clock)
- [x] `^FD` - Field Data
- [x] `^FH` - Field Hexadecimal Indicator
- [ ] `^FM` - Multiple Field Origin Locations
- [ ] `^FN` - Field Number
- [x] `^FO` - Field Origin
- [ ] `^FP` - Field Parameter
- [ ] `^FR` - Field Reverse Print
- [x] `^FS` - Field Separator
- [ ] `^FT` - Field Typeset
- [ ] `^FV` - Field Variable
- [ ] `^FW` - Field Orientation
- [ ] `^FX` - Comment
- [x] `^GB` - Graphic Box
- [ ] `^GC` - Graphic Circle
- [ ] `^GD` - Graphic Diagonal Line
- [ ] `^GE` - Graphic Ellipse
- [x] `^GF` - Graphic Field
- [ ] `^GS` - Graphic Symbol
- [ ] `~HB` - Battery Status
- [ ] `~HD` - Head Diagnostic
- [ ] `^HF` - Host Format
- [ ] `^HG` - Host Graphic
- [ ] `^HH` - Configuratin Label Return
- [ ] `~HI` - Host Identification
- [ ] `~HM` - Host RAM Status
- [ ] `~HS` - Host Status Return
- [ ] `~HU` - Return ZebraNet Alert Configuration
- [ ] `^HV` - Host Verification
- [ ] `^HW` - Host Directory List
- [ ] `^HY` - Upload Graphics
- [ ] `^HZ` - Display Description Information
- [x] `^ID` - Object Delete
- [ ] `^IL` - Image Load
- [ ] `^IM` - Image Move
- [ ] `^IS` - Image Save
- [ ] `~JA` - Cancel All
- [ ] `^JB` - Initialize Flash Memory
- [ ] `~JB` - Reset Optional Memory
- [ ] `~JC` - Set Media Sensor Calibration
- [ ] `~JD` - Enable Communications Diagnostics
- [ ] `~JE` - Disable Diagnostics
- [ ] `~JF` - Set Battery Condition
- [ ] `~JG` - Graphing Sensor Calibration
- [ ] `^JJ` - Set Auxiliary Port
- [ ] `~JL` - Set Label Length
- [ ] `^JM` - Set Dots per Millimeter
- [ ] `~JN` - Head Test Fatal
- [ ] `~JO` - Head Test Non-Fatal
- [ ] `~JP`: Pause and Cancel Format
- [ ] `~JR`: Power On Reset
- [ ] `^JS`: Sensor Select
- [ ] `~JS`: Change Backfeed Sequence
- [ ] `^JT`: Head Test Interval
- [ ] `^JU`: Configuration Update
- [ ] `^JW`: Set Ribbon Tension
- [ ] `~JX`: Cancel Current Partially Input Format
- [ ] `^JZ`: Reprint After Error
- [ ] `~KB`: Kill Battery (Battery Discharge Mode)
- [ ] `^KD`: Select Date and Time Format (for Real Time Clock)
- [ ] `^KL`: Define Language
- [ ] `^KN`: Define Printer Name
- [ ] `^KP`: Set Password
- [x] `^LH`: Label Home
- [x] `^LL`: Label Length
- [x] `^LR`: Label Reverse Print
- [ ] `^LS`: Label Shift
- [ ] `^LT`: Label Top
- [ ] `^MC`: Map Clear
- [ ] `^MD`: Media Darkness
- [ ] `^MF`: Media Feed
- [ ] `^ML`: Maximum Label Length
- [ ] `^MM`: Print Mode
- [ ] `^MN`: Media Tracking
- [ ] `^MP`: Mode Protection
- [ ] `^MT`: Media Type
- [ ] `^MU`: Set Units of Measurement
- [ ] `^MW`: Modify Head Cold Warning
- [ ] `~NC`: Network Connect
- [ ] `^NI`: Network ID Number
- [ ] `~NR`: Set All Printers Transparent
- [ ] `^NS`: Change Networking Settings
- [ ] `~NT`: Set Currently Connected Printer Transparent
- [ ] `^PF`: Slew Given Number of Dot Rows
- [ ] `^PH`: Slew to Home Position
- [ ] `~PH`: Slew to Home Position
- [ ] `^PM`: Printing Mirror Image of Label
- [ ] `^PO`: Print Orientation
- [ ] `^PP`: Programmable Pause
- [ ] `~PP`: Programmable Pause
- [ ] `^PQ`: Print Quantity
- [ ] `^PR`: Print Rate
- [ ] `~PR`: Applicator Reprint
- [ ] `~PS`: Print Start
- [x] `^PW`: Print Width
- [ ] `~RO`: Reset Advanced Counter
- [ ] `^SC`: Set Serial Communications
- [x] `~SD`: Set Darkness
- [ ] `^SE`: Select Encoding
- [ ] `^SF`: Serialization Field (with a standard ^FD String)
- [ ] `^SL`: Set Mode and Language
- [ ] `^SN`: Serialization Data
- [ ] `^SO`: Set Offset (for Real Time Clock)
- [ ] `^SP`: Start Print
- [ ] `^SQ`: Halt ZebraNet Alert
- [ ] `^SR`: Set Printhead Resistance
- [ ] `^SS`: Set Media Sensors
- [ ] `^ST`: Set Date and Time (for Real Time Clock)
- [ ] `^SX`: Set ZebraNet Alert
- [ ] `^SZ`: Set ZPL Mode
- [ ] `~TA`: Tear-off Adjust Position
- [ ] `^TO`: Transfer Object
- [ ] `~WC`: Print Configuration Label
- [ ] `^WD`: Print Directory Label
- [x] `^XA`: Start Format
- [ ] `^XB`: Suppress Backfeed
- [ ] `^XF`: Recall Format
- [x] `^XG`: Recall Graphic
- [x] `^XZ`: End Format
- [ ] `^ZZ`: Printer Sleep

> [!TIP]
> If you need an unsupported ZPL command, use the `raw` method available on both `Label` and `PrinterSetup`.
>
> ```typescript
> import { PrinterSetup } from "node-zpl";
>
> // Put a battery powered printer to sleep after 10s
> const zpl = new PrinterSetup().raw("^ZZ10").toZPL();
> ```

## Contributing

Contributions to `node-zpl` are always welcome!
See [CONTRIBUTING.md](./CONTRIBUTING.md) for details on how to get started.

## License

`node-zpl` is licensed under the [MIT License](./LICENSE)
