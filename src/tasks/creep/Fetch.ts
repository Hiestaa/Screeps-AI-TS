import { ReturnCodeSwitcher } from "agents/controllers/BaseController";
import { CreepController } from "agents/controllers/CreepController";
import { COLORS, getLogger } from "utils/Logger";
import { BaseCreepTask } from "./BaseCreepTask";

const logger = getLogger("tasks.creep.Fetch", COLORS.tasks);
/**
 * The fetch task will control the creep to retrieve energy from the closest
 * available drop / container / source in that order.
 */
export class Fetch extends BaseCreepTask {
    constructor() {
        super("TASK_FETCH");
    }

    public execute(creep: CreepController): void {
        // TODO[OPTIMIZATION]: remember assigned target in memory to save on computation

        const tombstone = creep.creep.pos.findClosestByRange(FIND_TOMBSTONES);
        if (tombstone) {
            logger.debug(`${creep}: picking up ${tombstone}`);
            this.moveToIfFail(creep, creep.withdraw(tombstone, RESOURCE_ENERGY), tombstone);
        }

        const droppedResource = creep.creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
            filter: item => item.resourceType === RESOURCE_ENERGY,
        });
        if (droppedResource) {
            logger.debug(`${creep}: picking up ${droppedResource}`);
            this.moveToIfFail(creep, creep.pickup(droppedResource), droppedResource);
            return;
        }

        const ruin = creep.creep.pos.findClosestByRange(FIND_RUINS);
        if (ruin) {
            logger.debug(`${creep}: picking up ${ruin}`);
            this.moveToIfFail(creep, creep.withdraw(ruin, RESOURCE_ENERGY), ruin);
        }

        const container = creep.creep.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: structure =>
                structure.structureType === STRUCTURE_CONTAINER && structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0,
        });
        if (container) {
            logger.debug(`${creep}: picking up ${container}`);
            this.moveToIfFail(creep, creep.withdraw(container, RESOURCE_ENERGY), container);
        }

        const source = creep.creep.pos.findClosestByRange(FIND_SOURCES_ACTIVE);
        if (source) {
            logger.debug(`${creep}: picking up ${source}`);
            this.moveToIfFail(creep, creep.harvest(source), source);
        }
    }

    private moveToIfFail(creep: CreepController, switcher: ReturnCodeSwitcher<any>, pos: { pos: RoomPosition }) {
        switcher
            .on(ERR_NOT_IN_RANGE, () => {
                creep.moveTo(pos).logFailure();
            })
            .logFailure();
    }

    public completed(creep: CreepController): boolean {
        return creep.creep.store.getFreeCapacity() === 0;
    }

    public description() {
        return "👜";
    }
}
