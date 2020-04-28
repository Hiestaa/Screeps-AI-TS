import { CreepController } from "agents/controllers/CreepController";
import { BaseCreepTask } from "tasks/creep/BaseCreepTask";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("tasks.creep.Heal", COLORS.tasks);

/**
 * Simple heal task - go heal from the first source available.
 * @param creepController controller for the creep that will perform this task
 */
export class Heal extends BaseCreepTask {
    public targets: string[];

    constructor(targets: string[]) {
        super("TASK_HEAL");
        this.targets = targets;
    }

    public canBeExecuted(creepCtl: CreepController) {
        return true;
    }

    public execute(creepCtl: CreepController) {
        const target = this.pickTarget(creepCtl);

        return creepCtl
            .heal(source)
            .on(ERR_NOT_IN_RANGE, () => {
                creepCtl.moveTo(source).logFailure();
            })
            .on(ERR_NOT_ENOUGH_RESOURCES, () => {
                logger.warning(
                    `Source: ${source} depleted - pausing harvesting for ${source.ticksToRegeneration} ticks.`,
                );
                this.pause(source.ticksToRegeneration);
            })
            .logFailure();
    }

    private pickTarget(creepCtl: CreepController): Creep {
        return;
    }

    public toJSON(): HarvestTaskMemory {
        const json = super.toJSON();
        const memory: HarvestTaskMemory = { targets: this.targets, ...json };
        return memory;
    }
    public completed(creepCtl: CreepController) {
        // TODO: maybe make it a forever task?
        return this.targets.length === 0; // every target is full of health!
    }

    public description() {
        return "⛏️";
    }
}
