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
        const target = this.getTarget(creepCtl);

        if (target !== null) {
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
        } else {
            logger.debug(`No damaged building the current creep room`);

            this.noMoreTarget = true;
            return;
        }
    }

    private getTarget(creepCtl: CreepController) {
        const decayGranularity = 10;
        let target = creepCtl.creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
            filter: Structure => Structure.hits < 100,
        });
        if (target) {
            return target;
        }
        for (let index = 0; index < decayGranularity; index++) {
            target = creepCtl.creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
                filter: Structure => Structure.hits < (index / decayGranularity) * Structure.hitsMax,
            });
            if (target) {
                return target;
            }
        }
        return null;
    }

    public completed(creepCtl: CreepController) {
        return this.noMoreTarget || creepCtl.creep.store.getUsedCapacity() === 0;
    }

    public description() {
        return "🚧";
    }
}
