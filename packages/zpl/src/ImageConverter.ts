import Jimp from "jimp";
import ZplError from "./ZplError.js";

const zplMapCodes = {
  1: "G",
  2: "H",
  3: "I",
  4: "J",
  5: "K",
  6: "L",
  7: "M",
  8: "N",
  9: "O",
  10: "P",
  11: "Q",
  12: "R",
  13: "S",
  14: "T",
  15: "U",
  16: "V",
  17: "W",
  18: "X",
  19: "Y",
  20: "g",
  40: "h",
  60: "i",
  80: "j",
  100: "k",
  120: "l",
  140: "m",
  160: "n",
  180: "o",
  200: "p",
  220: "q",
  240: "r",
  260: "s",
  280: "t",
  300: "u",
  320: "v",
  340: "w",
  360: "x",
  380: "y",
  400: "z",
} as const;

class ImageConverter {
  public compress = true;
  private blackLimit = 128;

  public get blacknessLimitPercentage(): number {
    return (this.blackLimit * 100) / 255;
  }

  public set blacknessLimitPercentage(blacknessLimitPercentage: number) {
    this.blackLimit = (blacknessLimitPercentage * 255) / 100;
  }

  public async toZPL(image: Buffer): Promise<ZplImage> {
    const img = await Jimp.read(image);

    const width = img.bitmap.width;
    const height = img.bitmap.height;
    const bytesPerRow = Math.ceil(width / 8);
    const totalBytes = bytesPerRow * height;

    let data = "";

    for (let y = 0; y < height; y++) {
      let rowByteString = "";
      for (let x = 0; x < width; x += 8) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit++) {
          if (x + bit < width) {
            const pixel = Jimp.intToRGBA(img.getPixelColor(x + bit, y));
            const grayscale = 0.3 * pixel.r + 0.59 * pixel.g + 0.11 * pixel.b;
            const isBlack = grayscale < this.blackLimit;
            const isTransparent = pixel.a === 0;
            if (isBlack && !isTransparent) {
              byte |= 1 << (7 - bit);
            }
          }
        }
        rowByteString += byte.toString(16).padStart(2, "0");
      }
      data += rowByteString + "\n";
    }

    return {
      width: width,
      height: height,
      totalBytes: totalBytes,
      bytesPerRow: bytesPerRow,
      data: this.compress ? this.encodeHexAscii(data) : data,
    };
  }

  private getEncodedString(counter: number, char: string): string {
    let encodedString = "";

    while (counter > 0) {
      // Find the largest number in zplMapCodes that's less than or equal to counter
      const keys = Object.keys(zplMapCodes)
        .map((k) => parseInt(k))
        .sort((a, b) => b - a);
      let key = keys.find((k) => k <= counter);
      if (!key) {
        key = 1;
      }

      const keyIsMapCode = (key: number): key is keyof typeof zplMapCodes =>
        key in zplMapCodes;

      if (!keyIsMapCode(key)) {
        throw new ZplError(`Key ${key} is not a valid map code`);
      }

      // Add the corresponding ZPL code to the encoded string
      encodedString += zplMapCodes[key];

      // Subtract the key from the counter
      counter -= key;
    }

    // Add the character to the encoded string
    encodedString += char;

    return encodedString;
  }

  private encodeHexAscii(code: string): string {
    let codeBuffer = "";
    let counter = 1;
    let currentChar = code.charAt(0);

    for (let i = 1; i < code.length; i++) {
      if (code.charAt(i) === "\n") {
        if (counter > 0) {
          codeBuffer += this.getEncodedString(counter, currentChar);
        }
        counter = 1;
        currentChar = code.charAt(i + 1);
        i++; // Skip the next character because we've already processed it
      } else if (currentChar === code.charAt(i)) {
        counter++;
      } else {
        codeBuffer += this.getEncodedString(counter, currentChar);
        counter = 1;
        currentChar = code.charAt(i);
      }
    }

    // Handle the last sequence of characters
    if (counter > 0) {
      codeBuffer += this.getEncodedString(counter, currentChar);
    }

    return codeBuffer;
  }
}

type ZplImage = {
  width: number;
  height: number;
  totalBytes: number;
  bytesPerRow: number;
  data: string;
};

export default ImageConverter;
export { zplMapCodes };
export type { ZplImage };
