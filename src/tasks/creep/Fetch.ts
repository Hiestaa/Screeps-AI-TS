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
    public excludedPositions: Array<{ x: number; y: number }>;

    constructor(excludedPositions?: Array<{ x: number; y: number }>) {
        super("TASK_FETCH");
        this.excludedPositions = excludedPositions || [];
    }

    public execute(creep: CreepController): void {
        // TODO[OPTIMIZATION]: remember assigned target in memory to save on computation
        const hostiles = creep.creep.room.find(FIND_HOSTILE_CREEPS);

        // avoid any excluded position and any hostile creep
        const excPosFilter = ({ pos }: { pos: RoomPosition }) => {
            return (
                !this.excludedPositions.includes({ x: pos.x, y: pos.x }) &&
                hostiles.every(hostile => hostile.pos.getRangeTo(pos) > 5)
            );
        };

        const tombstone = creep.creep.pos.findClosestByRange(FIND_TOMBSTONES, {
            filter: structure => structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0 && excPosFilter(structure),
        });
        if (tombstone) {
            logger.debug(`${creep}: picking up ${tombstone}`);
            return this.moveToIfFail(creep, creep.withdraw(tombstone, RESOURCE_ENERGY), tombstone);
        }

        const ruin = creep.creep.pos.findClosestByRange(FIND_RUINS, { filter: excPosFilter });
        if (ruin) {
            logger.debug(`${creep}: picking up ${ruin}`);
            return this.moveToIfFail(creep, creep.withdraw(ruin, RESOURCE_ENERGY), ruin);
        }

        const droppedResource = creep.creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
            filter: item => item.resourceType === RESOURCE_ENERGY && item.amount > creep.creep.store.getFreeCapacity(),
        });
        if (droppedResource) {
            logger.debug(`${creep}: picking up ${droppedResource}`);
            return this.moveToIfFail(creep, creep.pickup(droppedResource), droppedResource);
        }

        const container = creep.creep.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: structure =>
                structure.structureType === STRUCTURE_CONTAINER &&
                structure.store.getUsedCapacity(RESOURCE_ENERGY) > creep.creep.store.getFreeCapacity() &&
                excPosFilter(structure),
        });
        if (container) {
            logger.debug(`${creep}: picking up ${container}`);
            return this.moveToIfFail(creep, creep.withdraw(container, RESOURCE_ENERGY), container);
        }

        if (creep.creep.memory.profile !== "Hauler") {
            const source = creep.creep.pos.findClosestByRange(FIND_SOURCES_ACTIVE);
            if (source) {
                logger.debug(`${creep}: picking up ${source}`);
                return this.moveToIfFail(creep, creep.harvest(source), source);
            }
        } else {
            logger.warning(`${creep}: no available energy deposit to fetch from - pausing for 10 cycles.`);
            this.pause(10);
        }
    }

    private moveToIfFail(creep: CreepController, switcher: ReturnCodeSwitcher<any>, pos: { pos: RoomPosition }): void {
        switcher
            .on(ERR_NOT_IN_RANGE, () => {
                creep.moveTo(pos).logFailure();
            })
            .on(ERR_FULL, () => {
                logger.debug(`${creep}: Creep is full - task is completed.`);
            })
            .on(ERR_NOT_ENOUGH_RESOURCES, () => {
                logger.debug(`${creep}: Target is empty - will try again.`);
            })
            .logFailure();
    }

    public completed(creep: CreepController): boolean {
        return creep.creep.store.getFreeCapacity() === 0;
    }

    public description() {
        return "👜";
    }

    public toJSON(): FetchTaskMemory {
        const json = super.toJSON();
        const memory: FetchTaskMemory = { excludedPositions: this.excludedPositions, ...json };
        return memory;
    }
}
