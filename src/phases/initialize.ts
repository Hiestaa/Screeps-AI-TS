import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("phases.initialize", COLORS.phases);

/**
 * Seeds the memory state to start from scratch.
 * This function is called for every turn, but should only have an effect on a bare game state (or wipe out)
 */
export function initialize(): void {
    if (!Memory.roomObjectives) {
        logger.warning("Initializing Memory state");
        Memory.roomObjectives = {};

        for (const roomName in Game.rooms) {
            if (Game.rooms.hasOwnProperty(roomName)) {
                Memory.roomObjectives[roomName] = {
                    name: "REACH_RCL2",
                };
            }
        }
    }
}
