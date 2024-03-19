import ZplError from "./ZplError.js";
import commands from "./commands.js";

/**
 * Base class for all ZPL content
 */
abstract class ZplContent {
  protected abstract zpl: string;

  /**
   * Add a raw ZPL command
   * @param zpl Any valid ZPL command
   */
  public raw(zpl: string): this {
    this.zpl += zpl;

    return this;
  }

  /**
   * @returns The generated ZPL
   */
  public toZPL(): string {
    return this.zpl;
  }

  /**
   * Validate the generated ZPL
   * @param strict Whether to throw an error if the ZPL is invalid. Disable this if you want to use commands that are not yet supported in this library.
   */
  public validate(strict = true): void {
    if (!this.zpl) {
      throw new ZplError("ZPL content is empty");
    }

    for (const line of this.zpl.split("\n")) {
      // ^ and ~ are the only valid starts to ZPL commands
      if (!line.startsWith("^") && !line.startsWith("~")) {
        throw new ZplError(`Invalid ZPL command: ${line}`);
      }
    }

    for (const line of this.zpl.split("\n")) {
      const command = line.split(",")[0];
      if (!Object.keys(commands).includes(command)) {
        if (strict) {
          throw new ZplError(`Unknown ZPL command: ${command}`);
        } else {
          console.warn(
            `Unknown ZPL command: ${command} - are you sure this is valid?`
          );
        }
      }
    }
  }
}

export default ZplContent;
