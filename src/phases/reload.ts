import { Colony } from "colony/Colony";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("phases.reload", COLORS.phases);

/**
 * Reload phase of the loop
 * Re-instantiate all the game objects based on the current memory/game state.
 */
export function reload(): { [key: string]: Colony } {
    logger.debug(">>> RELOAD <<<");

    const colonies: { [key: string]: Colony } = {};
    for (const roomName in Game.rooms) {
        if (!Game.rooms.hasOwnProperty(roomName)) {
            continue;
        }
        const room = Game.rooms[roomName];
        logger.debug(`Reloading colony in room: ${room}`);
        const colony = new Colony(room);
        colonies[roomName] = colony;
    }

    for (const creepName in Game.creeps) {
        if (!Game.creeps.hasOwnProperty(creepName)) {
            continue;
        }

        const creep = Game.creeps[creepName];
        const roomName = creep.room && creep.room.name;
        if (!roomName) {
            logger.warning(
                `Failed to reload creep ${creepName} because it is located in a room that is not visible at the moment. `,
            );
            continue;
        }

        const colony = colonies[roomName];
        if (!colony) {
            logger.warning(
                `Failed to reload creep ${creepName} because it is located in a room that is not visible at the moment. `,
            );
            continue;
        }

        logger.debug(`Reloading creep: ${creep}`);
        colony.reloadCreep(creepName);
    }

    // TODO: necessary to clear up memory when `Memory.creep` exist but not `Game.creep`?
    // Would it screw the spawning process with memory pre-setting?
    return colonies;
}
