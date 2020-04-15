import { CreepController } from "controllers/CreepController";
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

    public execute(creepCtl: CreepController) {
        const spawns = creepCtl.creep.room.find(FIND_MY_SPAWNS);
        if (spawns.length <= 0) {
            logger.warning("No spawn available in the current creep room");
            return;
        }

        creepCtl
            .transfer(spawns[0], RESOURCE_ENERGY)
            .on(ERR_NOT_IN_RANGE, () => {
                creepCtl.moveTo(spawns[0]).logFailure();
            })
            .logFailure();
    }

    public completed(creepCtl: CreepController) {
        return creepCtl.creep.store.getUsedCapacity() === 0;
    }

    public description() {
        return "👜";
    }
}
