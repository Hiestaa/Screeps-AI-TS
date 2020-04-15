import { mainLoop } from "phases";
import "utils/cli";
import { ErrorMapper } from "utils/ErrorMapper";
import { getLogger } from "utils/Logger";
import "utils/prototypes";
import { VERSION } from "utils/version";

const logger = getLogger("main", "white");

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
    logger.debug("vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv");
    logger.debug(`[MAIN] Tick ${Game.time} begins - ${VERSION}.`);
    try {
        mainLoop();
    } catch (e) {
        logger.fatal(`Interrupted tick: ${e.message}\n${e.stack}`);
        // tslint:disable-next-line:no-debugger
        debugger;
        throw e;
    }
    logger.debug(`[MAIN] Tick ${Game.time} ends.`);
    logger.debug("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^");

    // Automatically delete memory of missing creeps
    for (const name in Memory.creeps) {
        if (!(name in Game.creeps)) {
            delete Memory.creeps[name];
        }
    }
});
