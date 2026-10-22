// Copy zpl-renderer-js's WebAssembly into public/ so it's served as its own
// file, which browsers can compile while it downloads
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
mkdirSync("public", { recursive: true });
copyFileSync(require.resolve("zpl-renderer-js/wasm"), "public/zebrash.wasm");
