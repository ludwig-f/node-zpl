import ZplContent from "./ZplContent.js";
import ZplError from "./ZplError.js";
import type { StorageDevice } from "./ast.js";
import type { Graphic } from "./types.js";

class PrinterSetup extends ZplContent {
  /**
   * Set the darkness of the printer
   * @param darkness Darkness from 0 to 30
   */
  public setDarkness(darkness: number): this {
    if (darkness < 0 || darkness > 30) {
      throw new ZplError("Darkness must be between 0 and 30");
    }

    return this.add({ type: "SetDarkness", darkness: Math.round(darkness) });
  }

  /**
   * Store a graphic on the printer, to be drawn with Label.drawStoredGraphic
   * @param options.name Name of the graphic, 1 to 8 characters
   * @param options.graphic Graphic to store, e.g. from ImageConverter
   * @param options.device Device to store the graphic on - defaults to "R" (DRAM)
   */
  public storeGraphic(options: {
    name: string;
    graphic: Graphic;
    device?: StorageDevice;
  }): this {
    const { name, graphic, device = "R" } = options;

    if (name.length < 1 || name.length > 8) {
      throw new ZplError("Name must be between 1 and 8 characters long");
    }

    return this.add({
      type: "DownloadGraphic",
      device,
      name,
      totalBytes: graphic.totalBytes,
      bytesPerRow: graphic.bytesPerRow,
      data: graphic.data,
    });
  }

  /**
   * Delete a stored graphic from the printer
   * @param name Name of the graphic
   * @param device Device the graphic is stored on - defaults to "R" (DRAM)
   */
  public deleteGraphic(name: string, device: StorageDevice = "R"): this {
    return this.add({ type: "DeleteObject", device, name, extension: "GRF" });
  }
}

export default PrinterSetup;
