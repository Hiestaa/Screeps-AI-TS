import { ReturnCodeSwitcher } from "agents/controllers/BaseController";
import { CreepController } from "agents/controllers/CreepController";
import { COLORS, getLogger } from "utils/Logger";
import { BaseCreepTask } from "./BaseCreepTask";

const logger = getLogger("tasks.creep.Fetch", COLORS.tasks);
const MAX_RANGE_HOSTILE = 8;

const allFetchTargets = [
    FIND_TOMBSTONES,
    FIND_RUINS,
    FIND_DROPPED_RESOURCES,
    STRUCTURE_CONTAINER,
    STRUCTURE_STORAGE,
    FIND_SOURCES,
];

/**
 * The fetch task will control the creep to retrieve energy from the closest
 * available drop / container / source in that order.
 */
export class Fetch extends BaseCreepTask {
    public excludedPositions: Array<{ x: number; y: number }>;
    private lastFetchTargetId?: string;
    public targetPriority: FETCH_TARGETS[];

    constructor({ targetPriority, excludedPositions, lastFetchTargetId }: {
        targetPriority?: FETCH_TARGETS[],
        excludedPositions?: Array<{ x: number; y: number }>,
        lastFetchTargetId?: string,
    } = {}) {
        super({ type: "TASK_FETCH" });
        this.excludedPositions = excludedPositions || [];
        this.targetPriority = targetPriority || [];
        this._addMissingTargets();
        this.lastFetchTargetId = lastFetchTargetId;
    }

    private _addMissingTargets(): void {
        for (const target of allFetchTargets) {
            if (!this.targetPriority.includes(target)) {
                this.targetPriority.push(target);
            }
        }
    }

    public execute(creepCtl: CreepController) {
        // TODO[OPTIMIZATION]: remember assigned target in memory to save on computation
        const hostiles = creepCtl.creep.room.find(FIND_HOSTILE_CREEPS);

        // avoid any excluded position and any hostile creep
        const excPosFilter = ({ pos }: { pos: RoomPosition }) => {
            return (
                !this.excludedPositions.find(({ x, y }) => x === pos.x && y === pos.y) &&
                hostiles.every(hostile => hostile.pos.getRangeTo(pos) > MAX_RANGE_HOSTILE)
            );
        };

        for (const fetchTarget of this.targetPriority) {
            let foundTarget: boolean = false;
            if (fetchTarget === FIND_TOMBSTONES || fetchTarget === FIND_RUINS) {
                foundTarget = this.withdrawFromTombOrRuin(creepCtl, fetchTarget, excPosFilter);
            } else if (fetchTarget === FIND_DROPPED_RESOURCES) {
                foundTarget = this.pickupDroppedResource(creepCtl, excPosFilter);
            } else if (fetchTarget === STRUCTURE_STORAGE || fetchTarget === STRUCTURE_CONTAINER) {
                foundTarget = this.withdrawFromStorage(creepCtl, fetchTarget, excPosFilter);
            } else if (fetchTarget === FIND_SOURCES && creepCtl.creep.memory.profile !== "Hauler") {
                foundTarget = this.extractFromSource(creepCtl, excPosFilter);
            }

            if (foundTarget) {
                return;
            }
        }

        logger.debug(`${creepCtl}: no available energy deposit to fetch from - pausing for 10 cycles.`);
        this.pause(10);
    }

    private withdrawFromTombOrRuin(
        creepCtl: CreepController,
        fetchTarget: FIND_TOMBSTONES | FIND_RUINS,
        commonFilter: (structure: { pos: RoomPosition }) => boolean,
    ) {
        const target = creepCtl.creep.pos.findClosestByRange(fetchTarget, {
            filter: structure => structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0 && commonFilter(structure),
        });
        if (target) {
            logger.debug(`${creepCtl}: withdrawing from ${target}`);
            this.lastFetchTargetId = target.id;
            this.moveToIfFail(creepCtl, creepCtl.withdraw(target, RESOURCE_ENERGY), target);
            return true;
        }
        return false;
    }

    private pickupDroppedResource(
        creepCtl: CreepController,
        commonFilter: (structure: { pos: RoomPosition }) => boolean,
    ) {
        const droppedResource = creepCtl.creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
            filter: item =>
                item.resourceType === RESOURCE_ENERGY &&
                item.amount > creepCtl.creep.store.getFreeCapacity() &&
                commonFilter(item),
        });
        if (droppedResource) {
            logger.debug(`${creepCtl}: picking up ${droppedResource}`);
            this.lastFetchTargetId = droppedResource.id;
            this.moveToIfFail(creepCtl, creepCtl.pickup(droppedResource), droppedResource);
            return true;
        }
        return false;
    }

    private withdrawFromStorage(
        creepCtl: CreepController,
        fetchTarget: STRUCTURE_CONTAINER | STRUCTURE_STORAGE,
        commonFilter: (structure: { pos: RoomPosition }) => boolean,
    ) {
        const target = creepCtl.creep.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: structure =>
                structure.structureType === fetchTarget &&
                structure.store.getUsedCapacity(RESOURCE_ENERGY) > creepCtl.creep.store.getFreeCapacity() &&
                commonFilter(structure),
        });
        if (target) {
            logger.debug(`${creepCtl}: withdrawing from ${target}`);
            // remember target resource got fetched from not to haul straight back in after
            this.lastFetchTargetId = target.id;
            this.moveToIfFail(creepCtl, creepCtl.withdraw(target, RESOURCE_ENERGY), target);
            return true;
        }
        return false;
    }

    private extractFromSource(creepCtl: CreepController, commonFilter: (structure: { pos: RoomPosition }) => boolean) {
        const source = creepCtl.creep.pos.findClosestByRange(FIND_SOURCES_ACTIVE, { filter: commonFilter });
        if (source) {
            logger.debug(`${creepCtl}: picking up ${source}`);
            this.lastFetchTargetId = source.id;
            this.moveToIfFail(creepCtl, creepCtl.harvest(source), source);
            return true;
        }
        return false;
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
            .on(ERR_INVALID_TARGET, () => {
                logger.failure(ERR_INVALID_TARGET, `${creep}: Invalid target at position: ${pos}`);
                this.excludedPositions.push(pos.pos);
            })
            .logFailure();
    }

    public completed(creep: CreepController): boolean {
        return creep.creep.store.getFreeCapacity() === 0;
    }

    public persistAfterCompletion(): undefined | PersistTaskMemory {
        return {
            prevTask: this.type,
            // remember container resource got fetched from not to haul straight back in after
            lastFetchTargetId: this.lastFetchTargetId,
        };
    }

    public description() {
        return "👜";
    }

    public toJSON(): FetchTaskMemory {
        const json = super.toJSON();
        const memory: FetchTaskMemory = {
            excludedPositions: this.excludedPositions,
            targetPriority: this.targetPriority,
            lastFetchTargetId: this.lastFetchTargetId,
            ...json,
        };
        return memory;
    }
}
