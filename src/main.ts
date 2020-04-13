import { mainLoop } from "phases";
import { ErrorMapper } from "utils/ErrorMapper";
import { getLogger } from "utils/Logger";
import "utils/prototypes";

const logger = getLogger("main", "white");

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
    console.log(`Current game tick is ${Game.time}`);

    logger.debug("vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv");
    logger.debug(`[MAIN] Tick ${Game.time} begins."`);
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
