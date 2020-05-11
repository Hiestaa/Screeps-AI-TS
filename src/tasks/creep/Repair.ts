import { CreepController } from "agents/controllers/CreepController";
import { BaseCreepTask } from "tasks/creep/BaseCreepTask";
import { findNearbyMostDamaged } from "utils/findHelpers";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("tasks.creep.Repair", COLORS.tasks);

/**
 * Simple Haul task - go Haul resources to the first available spawn
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
            logger.debug(
                `${creepCtl}: Repairing damaged target building: ${target} (${target.hits} hits/ ${target.hitsMax} total}`,
            );
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
            logger.debug(`${creepCtl}: No damaged building the current creep room`);

            this.noMoreTarget = true;
            return;
        }
    }

    private getTarget(creepCtl: CreepController): Structure | null {
        const nearbyOwned = findNearbyMostDamaged(creepCtl.creep.pos, FIND_MY_STRUCTURES, 10) as Structure;
        if (nearbyOwned) {
            return nearbyOwned;
        }
        const nearby = findNearbyMostDamaged(creepCtl.creep.pos, FIND_STRUCTURES, 10) as Structure;
        if (nearby && nearby.structureType === STRUCTURE_CONTAINER) {
            return nearby;
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
