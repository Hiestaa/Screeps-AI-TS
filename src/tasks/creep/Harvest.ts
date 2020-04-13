import { CreepController } from "controllers/CreepController";
import { BaseCreepTask } from "tasks/creep/BaseCreepTask";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("tasks.creep.Harvest", COLORS.tasks);

/**
 * Simple harvest task - go harvest from the first source available.
 * @param creepController controller for the creep that will perform this task
 */
export class Harvest extends BaseCreepTask {
    constructor() {
        super("TASK_HARVEST");
    }

    public execute(creep: Creep) {
        const sources = creep.room.find(FIND_SOURCES);
        if (sources.length <= 0) {
            logger.warning("No source available in the current creep room");
            return;
        }
        const hCode = creep.harvest(sources[0]);
        if (hCode === ERR_NOT_IN_RANGE) {
            const mCode = creep.moveTo(sources[0]);
            if (mCode !== OK && mCode !== ERR_BUSY) {
                logger.failure(mCode, `${creep}: Unable to perform moveTo action`);
            }
        } else if (hCode !== OK && hCode !== ERR_BUSY) {
            logger.failure(hCode, `${creep}: Unable to perform harvest action`);
        }
    }

    public completed(creep: Creep) {
        return creep.store.getFreeCapacity() === 0;
    }

    public description() {
        return "⛏️";
    }
}
