import { BaseCreepTask } from "tasks/creep/BaseCreepTask";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("tasks.creep.Haul", COLORS.tasks);

/**
 * Simple Haul task - go Haul resources to the first available spawn
 * @param creepController controller for the creep that will perform this task
 */
export class Haul extends BaseCreepTask {
    constructor() {
        super("TASK_HAUL");
    }

    public execute(creep: Creep) {
        const spawns = creep.room.find(FIND_MY_SPAWNS);
        if (spawns.length <= 0) {
            logger.warning("No spawn available in the current creep room");
            return;
        }
        const tCode = creep.transfer(spawns[0], RESOURCE_ENERGY);
        if (tCode === ERR_NOT_IN_RANGE) {
            const mCode = creep.moveTo(spawns[0]);
            if (mCode !== OK && mCode !== ERR_BUSY) {
                logger.failure(mCode, `${creep}: Unable to perform moveTo action`);
            }
        } else if (tCode !== OK && tCode !== ERR_BUSY) {
            logger.failure(tCode, `${creep}: Unable to perform transfer action`);
        }
    }

    public completed(creep: Creep) {
        return creep.store.getUsedCapacity() === 0;
    }

    public description() {
        return "👜";
    }
}
