import { CreepController } from "agents/controllers/CreepController";
import { BaseCreepTask } from "tasks/creep/BaseCreepTask";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("tasks.creep.Harvest", COLORS.tasks);

/**
 * Simple harvest task - go harvest from the first source available.
 * @param creepController controller for the creep that will perform this task
 */
export class Harvest extends BaseCreepTask {
    public sourceId: string;

    constructor(sourceId: string, type?: CREEP_TASK) {
        super(type || "TASK_HARVEST");
        this.sourceId = sourceId;
    }

    public canBeExecuted(creepCtl: CreepController) {
        return creepCtl.creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
    }

    public execute(creepCtl: CreepController) {
        const source = this.getSource(creepCtl);
        if (!source) {
            return;
        }

        return creepCtl
            .harvest(source)
            .on(ERR_NOT_IN_RANGE, () => {
                creepCtl.moveTo(source).logFailure();
            })
            .logFailure();
    }

    private getSource(creepCtl: CreepController): Source | undefined {
        if (this.sourceId) {
            const source = Game.getObjectById(this.sourceId) as Source;
            if (source) {
                return source;
            } else {
                logger.warning(`Designated source ${this.sourceId} for harvesting could not be found.`);
            }
        }

        const sources = creepCtl.creep.room.find(FIND_SOURCES);
        if (sources.length <= 0) {
            logger.warning("No source available in the current creep room");
            return;
        }

        return sources[0];
    }

    public toJSON(): HarvestTaskMemory {
        const json = super.toJSON();
        const memory: HarvestTaskMemory = { sourceId: this.sourceId, ...json };
        return memory;
    }
    public completed(creepCtl: CreepController) {
        return creepCtl.creep.store.getFreeCapacity() === 0;
    }

    public description() {
        return "⛏️";
    }
}

/**
 * Never stop harvesting even when full - will continue and let resource drop on the floor
 */
export class HarvestNonStop extends Harvest {
    constructor(sourceId: string) {
        super(sourceId, "TASK_HARVEST_NON_STOP");
    }

    public canBeExecuted(creepCtl: CreepController) {
        return true;
    }

    public completed() {
        return false;
    }
}
