"use strict";

import path from "path";

import clear from "rollup-plugin-clear";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import screeps from "rollup-plugin-screeps";
import progress from "rollup-plugin-progress";
import versionInject from "./rollup-plugin-version-inject";

let cfg;
const dest = process.env.DEST;
if (!dest) {
    console.log("No destination specified - code will be compiled but not uploaded");
} else if ((cfg = require("./screeps.json")[dest]) == null) {
    throw new Error("Invalid upload destination");
}

export default {
    input: "src/main.ts",
    output: {
        file: "dist/main.js",
        format: "cjs",
        sourcemap: true,
    },

    plugins: [
        clear({ targets: ["dist"] }),
        resolve({
            rootDir: path.join(process.cwd(), "./src"),
        }),
        commonjs(),
        typescript({ tsconfig: "./tsconfig.json" }),
        progress(),
        versionInject(),
        screeps({ config: cfg, dryRun: cfg == null }),
    ],
};
