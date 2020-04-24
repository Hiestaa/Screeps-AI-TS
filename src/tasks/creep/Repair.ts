import { CreepController } from "agents/controllers/CreepController";
import { BaseCreepTask } from "tasks/creep/BaseCreepTask";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("tasks.creep.Repair", COLORS.tasks);

/**
 * Simple Haul task - go Haul resources to the first available spawn
 * @param creepController controller for the creep that will perform this task
 */
export class Repair extends BaseCreepTask {
    // when on, task is complete - only useful during the current turn, saving in task memory is not needed
    private noMoreTarget: boolean = false;

    /**
     */
    constructor() {
        super("TASK_REPAIR");
    }

    public canBeExecuted(creepCtl: CreepController) {
        return creepCtl.creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
    }

    public execute(creepCtl: CreepController) {
        const target = creepCtl.creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
            filter: Structure => Structure.hits < Structure.hitsMax,
        }); // TODO: filter the ones that are full (if that makes sense)
        if (!target) {
            logger.debug(`No damaged building the current creep room`);
            this.noMoreTarget = true;
            return;
        }

        creepCtl
            .repair(target)
            .on(ERR_NOT_IN_RANGE, () => {
                creepCtl.moveTo(target).logFailure();
            })
            .on(ERR_INVALID_TARGET, () => {
                logger.debug(`${creepCtl}: target ${target} is fully repaired.`);
            })
            .on(ERR_NOT_ENOUGH_RESOURCES, () => {
                logger.debug(`${creepCtl}: No more energy - task is completed.`);
            })
            .logFailure();
    }

    public completed(creepCtl: CreepController) {
        return this.noMoreTarget || creepCtl.creep.store.getUsedCapacity() === 0;
    }

    public description() {
        return "🚧";
    }
}
