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

    public execute(creepCtl: CreepController) {
        const sources = creepCtl.creep.room.find(FIND_SOURCES);
        if (sources.length <= 0) {
            logger.warning("No source available in the current creep room");
            return;
        }

        return creepCtl
            .harvest(sources[0])
            .on(ERR_NOT_IN_RANGE, () => {
                creepCtl.moveTo(sources[0]).logFailure();
            })
            .logFailure();
    }

    public completed(creepCtl: CreepController) {
        return creepCtl.creep.store.getFreeCapacity() === 0;
    }

    public description() {
        return "⛏️";
    }
}
