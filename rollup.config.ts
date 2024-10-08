import typescript from "@rollup/plugin-typescript";
import { RollupOptions } from "rollup";

const production = !process.env.ROLLUP_WATCH;

const config: RollupOptions = {
  input: "src/extension.ts",
  output: {
    file: "out/extension.js",
    format: "cjs",
    sourcemap: !production,
  },
  plugins: [typescript()],
};

export default config;
