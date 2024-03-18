import ZplContent from "./ZplContent";
import ZplError from "./ZplError";
import type { StoreGraphicsOptions } from "./types";

class PrinterSetup extends ZplContent {
  public zpl = "";

  public setDarkness(darkness: number): PrinterSetup {
    if (darkness < 0 || darkness > 30) {
      throw new ZplError("Darkness must be between 0 and 30");
    }

    this.zpl += `~SD${Math.round(darkness).toString().padStart(2, "0")}\n`;
    return this;
  }

  public storeGraphics(
    name: string,
    totalBytes: number,
    bytesPerRow: number,
    data: string,
    options: StoreGraphicsOptions
  ): PrinterSetup {
    if (name.length < 1 || name.length > 8) {
      throw new ZplError("Name must be between 1 and 8 characters long");
    }

    const device = options.device ?? "R";
    this.zpl += `~DG${device}:${name}.GRF,${totalBytes},${bytesPerRow},${data}\n`;

    return this;
  }

  public deleteGraphics(
    name: string,
    device: StoreGraphicsOptions["device"] = "R"
  ) {
    this.zpl += `^ID${device}:${name}.GRF\n`;
    return this;
  }
}

export default PrinterSetup;
