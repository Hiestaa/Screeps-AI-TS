import { CreepController } from "agents/controllers/CreepController";
import { BaseCreepTask } from "tasks/creep/BaseCreepTask";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("tasks.creep.UpgradeController", COLORS.tasks);

/**
 * Simple Haul task - go Haul resources to the first available spawn
 * @param creepController controller for the creep that will perform this task
 */
export class UpgradeController extends BaseCreepTask {
    public noMoreTarget: boolean = false;

    constructor() {
        super("TASK_UPGRADE_CONTROLLER");
    }

    public canBeExecuted(creepCtl: CreepController) {
        return creepCtl.creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
    }

    public execute(creepCtl: CreepController) {
        // FIXME: if target is a controller we need to do `upgradeController` instead of `transfer`?
        const controller = creepCtl.creep.room.controller;
        if (!controller) {
            this.noMoreTarget = true;
            logger.warning(`There is no controller in room of ${creepCtl}`);
            return;
        }
        creepCtl
            .upgradeController(controller)
            .on(ERR_NOT_IN_RANGE, () => {
                creepCtl.moveTo(controller).logFailure();
            })
            .on(ERR_NOT_ENOUGH_ENERGY, () => {
                logger.debug(`${creepCtl}: No more energy - task is completed.`);
            })
            .logFailure();
    }

    public completed(creepCtl: CreepController) {
        return this.noMoreTarget || creepCtl.creep.store.getUsedCapacity() === 0;
    }

    public description() {
        return "⬆️";
    }
}
