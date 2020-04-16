import fs from "fs";

import packageJson from "./package.json";

export default function versionInject() {
    return {
        name: "version-inject", // this name will show up in warnings and errors
        buildStart(options) {
            return new Promise((resolve, reject) => {
                fs.writeFile(
                    "./src/utils/version.ts",
                    `/**
 * If the following works, then we might have a working version injection
 * Version: ${packageJson.version} - built on {${new Date().toString()}}
 */

export const VERSION = "Version: ${packageJson.version} - built on ${new Date().toString()}";`,
                    err => {
                        if (err) {
                            return reject(err);
                        }
                        return resolve();
                    },
                );
            });
        },
    };
}
