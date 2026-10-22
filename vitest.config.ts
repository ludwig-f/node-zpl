import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";

const src = (file: string) =>
  fileURLToPath(new URL(`./src/${file}`, import.meta.url));

export default defineConfig({
  // Tests use JSX the way consumers do, compiled against the local runtime
  esbuild: { jsx: "automatic", jsxImportSource: "node-zpl" },
  resolve: {
    alias: {
      "node-zpl/jsx-runtime": src("jsx-runtime.ts"),
      "node-zpl/jsx-dev-runtime": src("jsx-dev-runtime.ts"),
    },
  },
  test: {
    typecheck: {
      enabled: true,
      tsconfig: "./tsconfig.test.json",
    },
  },
});
