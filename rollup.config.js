"use strict";

import path from "path";

import clear from "rollup-plugin-clear";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import screeps from "rollup-plugin-screeps";
import progress from "rollup-plugin-progress";
import versionInjector from "rollup-plugin-version-injector";

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
        versionInjector({
            injectInComments: {
                fileRegexp: /\.(js|html|css|ts)$/g,
            },
            injectInTags: {
                fileRegexp: /\.(js|html|css|ts)$/g,
            },
        }),
        screeps({ config: cfg, dryRun: cfg == null }),
    ],
};
