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
    // Remove newlines
    const generatedZpl = this.toZPL().replace(/\n/g, "");

    if (!generatedZpl) {
      throw new ZplError("ZPL content is empty");
    }

    let currentCommand = "";
    let previousChar = "";

    for (const char of generatedZpl) {
      // If the current character is a ^ or ~ and the previous character was not, check the current command
      if (["^", "~"].includes(char) && !["^", "~"].includes(previousChar)) {
        if (currentCommand) {
          const foundCommand = Object.keys(commands).find((command) => {
            return currentCommand.startsWith(command);
          });

          if (strict && !foundCommand) {
            throw new ZplError(`Invalid ZPL command: ${currentCommand}`);
          }
        }

        // Start a new command
        currentCommand = char;
      } else {
        // Add the current character to the current command
        currentCommand += char;
      }

      previousChar = char;
    }

    // Check the last command
    const foundCommand = Object.keys(commands).find((command) => {
      return currentCommand.trim().startsWith(command);
    });

    if (strict && !foundCommand) {
      throw new ZplError(`Invalid ZPL command: ${currentCommand}`);
    }
  }
}

export default ZplContent;
