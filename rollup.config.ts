import typescript from "@rollup/plugin-typescript";
import { RollupOptions } from "rollup";

const config: RollupOptions = {
  input: "src/extension.ts",
  output: {
    file: "out/extension.js",
    format: "cjs",
  },
  plugins: [typescript()],
};

export default config;
