# node-zpl

`node-zpl` is a ZPL (Zebra Programming Language) generator for Node.js written in Typescript.

This library provides a thin (but typed!) wrapper around the ZPL commands as described by Zebra.

> [!NOTE]
> This library is under active development and does not yet support every single ZPL command. Please check the table below to see the currently supported commands. Contributions are welcome!

## Installation

Install `node-zpl` using the package manager of your choice. Using `npm`:

```bash
npm install node-zpl
```

## Usage

Here's a basic example of how to use `node-zpl` to generate a label with a EAN-13 bar code:

```typescript
import { Label, Orientation } from "node-zpl";

const label = new Label(57, 19, 12)
  .drawEAN13({
    position: {
      x: 10,
      y: 20,
    },
    orientation: Orientation.Normal,
  })
  .close();
const zpl = label.dumpZPL();
```

> [!TIP]
> To preview your generated ZPL you can use [Labelary](https://labelary.com/viewer.html)!

You can also convert an image to something usable in ZPL by using the provided `ImageConverter`:

```typescript
import { ImageConverter } from "node-zpl";
import { readFileSync } from "fs";

const converter = new ImageConverter();
const buffer = readFileSync("./assets/test-image.png");

const zpl = await converter.toZPL(buffer);
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
- [ ] `^BQ` - QR Code bar code
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
- [ ] `^CF` - Change Alphanumeric Default Font
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
- [ ] `^FD` - Field Data
- [ ] `^FH` - Field Hexadecimal Indicator
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
- [ ] `^GF` - Graphic Field
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
- [ ] `^PW`: Print Width
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
> If you need an unsupported ZPL command, use the `raw` method available on all ZplContent instances.
>
> ```typescript
> import { Printer } from "node-zpl";
>
> const printer = new Printer();
> // Put a battery powered printer to sleep after 10s
> const zpl = printer.raw("^ZZ10").dumpZPL();
> ```

## Contributing

Contributions to `node-zpl` are always welcome!
See [CONTRIBUTING.md](./CONTRIBUTING.md) for details on how to get started.

## License

`node-zpl` is licensed under the [MIT License](./LICENSE)
