import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("phases.initialize", COLORS.phases);

/**
 * Seeds the memory state to start from scratch.
 * This function is called for every turn, but should only have an effect on a bare game state (or wipe out)
 */
export function initialize(): void {
    if (!Memory.objective) {
        logger.warning("Initializing Memory state");

        Memory.objective = {
            name: "REACH_RCL1",
        };
    }
}
