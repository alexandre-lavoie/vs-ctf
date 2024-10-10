import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { RollupOptions } from "rollup";

const production = !process.env.ROLLUP_WATCH;

const config: RollupOptions = {
  input: "src/extension.ts",
  output: {
    dir: "out",
    format: "cjs",
    sourcemap: !production,
    manualChunks: (id) => {
      if (id.includes("node_modules")) {
        return "vendor";
      }
    },
  },
  external: ["vscode"],
  plugins: [resolve(), typescript(), commonjs()],
};

export default config;
