import { CreepController } from "agents/controllers/CreepController";
import { BaseCreepTask } from "tasks/creep/BaseCreepTask";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("tasks.creep.Harvest", COLORS.tasks);

/**
 * Simple harvest task - go harvest from the nearest source available.
 */
export class Harvest extends BaseCreepTask {
    public sourceId: string;
    public from?: { x: number; y: number };

    constructor(sourceId: string, from?: { x: number; y: number }, type?: "TASK_HARVEST_NON_STOP") {
        super(type || "TASK_HARVEST");
        this.sourceId = sourceId;
        this.from = from;
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
                if (this.from && (creepCtl.creep.pos.x !== this.from.x || creepCtl.creep.pos.y !== this.from.y)) {
                    creepCtl.moveTo(this.from.x, this.from.y).logFailure();
                } else {
                    creepCtl.moveTo(source).logFailure();
                }
            })
            .on(ERR_NOT_ENOUGH_RESOURCES, () => {
                logger.warning(
                    `Source: ${source} depleted - pausing harvesting for ${source.ticksToRegeneration} ticks.`,
                );
                this.pause(source.ticksToRegeneration);
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

        const source2 = creepCtl.creep.pos.findClosestByRange(FIND_SOURCES);
        if (!source2) {
            logger.warning("No source available in the current creep room");
            return;
        }

        return source2;
    }

    public toJSON(): HarvestTaskMemory {
        const json = super.toJSON();
        const memory: HarvestTaskMemory = { sourceId: this.sourceId, from: this.from, ...json };
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
    constructor(sourceId: string, from?: { x: number; y: number }) {
        super(sourceId, from, "TASK_HARVEST_NON_STOP");
    }

    public canBeExecuted(creepCtl: CreepController) {
        return true;
    }

    public completed() {
        return false;
    }
}
