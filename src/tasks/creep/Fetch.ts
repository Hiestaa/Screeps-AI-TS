import { ReturnCodeSwitcher } from "agents/controllers/BaseController";
import { CreepController } from "agents/controllers/CreepController";
import { COLORS, getLogger } from "utils/Logger";
import * as resourceLock from "utils/resourceLock";
import { BaseCreepTask } from "./BaseCreepTask";

const logger = getLogger("tasks.creep.Fetch", COLORS.tasks);
const MAX_RANGE_HOSTILE = 8;

const allFetchTargets = [
    FIND_TOMBSTONES,
    FIND_RUINS,
    FIND_DROPPED_RESOURCES,
    STRUCTURE_CONTAINER,
    STRUCTURE_STORAGE,
    FIND_SOURCES_ACTIVE,
];

type FetchTargetObject =
    | Tombstone
    | Ruin
    | StructureContainer
    | StructureStorage
    | Resource<ResourceConstant>
    | Source

/**
 * The fetch task will control the creep to retrieve energy from the closest
 * available drop / container / source in that order.
 */
export class Fetch extends BaseCreepTask {
    public excludedPositions: Array<{ x: number; y: number }>;
    private lastFetchTargetId?: string;
    private lastFetchTargetType?: FETCH_TARGETS;
    private lockedAmount?: number;
    private roomResourceLock?: string;
    public targetPriority: FETCH_TARGETS[];

    constructor({ targetPriority, excludedPositions, lastFetchTargetId, lastFetchTargetType, lockedAmount, roomResourceLock }: {
        targetPriority?: FETCH_TARGETS[],
        excludedPositions?: Array<{ x: number; y: number }>,
        lastFetchTargetId?: string,
        lastFetchTargetType?: FETCH_TARGETS,
        lockedAmount?: number,
        roomResourceLock?: string,
    } = {}) {
        super({ type: "TASK_FETCH" });
        this.excludedPositions = excludedPositions || [];
        this.targetPriority = targetPriority || [];
        this._addMissingTargets();
        this.lastFetchTargetId = lastFetchTargetId;
        this.lastFetchTargetType = lastFetchTargetType
        this.lockedAmount = lockedAmount
        this.roomResourceLock = roomResourceLock;
    }

    private _addMissingTargets(): void {
        for (const target of allFetchTargets) {
            if (!this.targetPriority.includes(target)) {
                this.targetPriority.push(target);
            }
        }
    }

    public execute(creepCtl: CreepController) {
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
            } else if (fetchTarget === FIND_SOURCES_ACTIVE && creepCtl.creep.memory.profile !== "Hauler") {
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
        return this.doFetch<FIND_TOMBSTONES | FIND_RUINS, Tombstone | Ruin>(
            creepCtl, fetchTarget, commonFilter,
            target => {
                logger.debug(`${creepCtl}: withdrawing from ${target}`);
                return creepCtl.withdraw(target, RESOURCE_ENERGY);
            },
        )
    }

    private pickupDroppedResource(
        creepCtl: CreepController,
        commonFilter: (structure: { pos: RoomPosition }) => boolean,
    ) {
        return this.doFetch<FIND_DROPPED_RESOURCES, Resource>(
            creepCtl, FIND_DROPPED_RESOURCES, commonFilter,
            droppedResource => {
                logger.debug(`${creepCtl}: picking up ${droppedResource}`);
                return creepCtl.pickup(droppedResource)
            }
        );
    }


    private withdrawFromStorage(
        creepCtl: CreepController,
        fetchTarget: STRUCTURE_CONTAINER | STRUCTURE_STORAGE,
        commonFilter: (structure: { pos: RoomPosition }) => boolean,
    ) {
        return this.doFetch<STRUCTURE_CONTAINER | STRUCTURE_STORAGE, StructureContainer | StructureStorage>(
            creepCtl, fetchTarget, commonFilter,
            target => {
                logger.debug(`${creepCtl}: withdrawing from ${target}`);
                return creepCtl.withdraw(target, RESOURCE_ENERGY);
            }
        );
    }

    private extractFromSource(
        creepCtl: CreepController,
        commonFilter: (structure: { pos: RoomPosition }) => boolean,
    ) {
        return this.doFetch<FIND_SOURCES_ACTIVE, Source>(
            creepCtl, FIND_SOURCES_ACTIVE, commonFilter,
            source => {
                logger.debug(`${creepCtl}: harvesting up ${source}`);
                return creepCtl.harvest(source);
            }
        )
    }

    private doFetch<FetchTarget extends FETCH_TARGETS, TargetStructure extends FetchTargetObject>(
        creepCtl: CreepController,
        fetchTarget: FetchTarget,
        commonFilter: (structure: { pos: RoomPosition }) => boolean,
        action: (target: TargetStructure) => ReturnCodeSwitcher<any>,
    ) {
        let target: TargetStructure | null = null;
        // if we already aimed to fetch from a particular target, pick this as a target
        if (this.lastFetchTargetId && this.lastFetchTargetType === fetchTarget && this.roomResourceLock) {
            target = Game.getObjectById(this.lastFetchTargetId) as TargetStructure;
            // resource decayed, got stolen by another faction, or a creep didn't honour resource reservation
            if (!target) {
                resourceLock.release('resources', this.roomResourceLock, this.lastFetchTargetId, this.lockedAmount || 0, creepCtl.creep.name);
                this.lastFetchTargetId = undefined;
                this.lastFetchTargetType = undefined;
                this.lockedAmount = undefined;
                // TODO: unreserve the resource (and remember how much was reserved)
            }
        }

        // no aim target, find a target if we haven't already aimed at another type of target
        if (!target && !this.lastFetchTargetType) {
            target = this.findFetchTarget(creepCtl, fetchTarget, commonFilter) as TargetStructure;
        }

        if (target) {
            const capacity = creepCtl.creep.store.getFreeCapacity();
            // this assumes the 'id' of a resource drop doesn't change if more resources are added - make sure this is true
            if (!this.lastFetchTargetId || this.lastFetchTargetId !== target.id) {
                if (this.roomResourceLock && this.lastFetchTargetId) {  // release any currently locked resource
                    resourceLock.release('resources', this.roomResourceLock, this.lastFetchTargetId, this.lockedAmount || 0, creepCtl.creep.name);
                }
                this.lockedAmount = capacity;
                this.roomResourceLock = creepCtl.creep.room.name;
                resourceLock.lock('resources', this.roomResourceLock, target.id, this.lockedAmount, creepCtl.creep.name);
            }
            this.lastFetchTargetId = target.id;
            this.lastFetchTargetType = fetchTarget;
            this.moveToIfFail(creepCtl, action(target), target);
            return true;
        }
        return false;
    }


    private findFetchTarget(creepCtl: CreepController, fetchTarget: FETCH_TARGETS, commonFilter: (structure: { pos: RoomPosition }) => boolean) {
        switch (fetchTarget) {
            case FIND_TOMBSTONES:
            case FIND_RUINS:
                return creepCtl.creep.pos.findClosestByRange(fetchTarget, {
                    filter: structure =>
                        structure.room
                        && structure.store.getUsedCapacity(RESOURCE_ENERGY)
                        - resourceLock.isLocked('resources', structure.room.name, structure.id) > 0
                        && commonFilter(structure),
                });
            case FIND_DROPPED_RESOURCES:
                return creepCtl.creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
                    filter: item =>
                        item.room
                        && item.resourceType === RESOURCE_ENERGY
                        && item.amount - resourceLock.isLocked('resources', item.room.name, item.id) > creepCtl.creep.store.getFreeCapacity()
                        && commonFilter(item),
                });
            case STRUCTURE_CONTAINER:
            case STRUCTURE_STORAGE:
                return creepCtl.creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: structure =>
                        structure.room
                        && structure.structureType === fetchTarget
                        && structure.store.getUsedCapacity(RESOURCE_ENERGY)
                        - resourceLock.isLocked('resources', structure.room.name, structure.id) > creepCtl.creep.store.getFreeCapacity()
                        && commonFilter(structure),
                });
            case FIND_SOURCES_ACTIVE:
                return creepCtl.creep.pos.findClosestByRange(FIND_SOURCES_ACTIVE, {
                    filter: structure =>
                        structure.room
                        && structure.energy - resourceLock.isLocked('resources', structure.room.name, structure.id)
                        > creepCtl.creep.store.getFreeCapacity()
                        && commonFilter(structure)
                });
        }
    }


    private moveToIfFail(
        creepCtl: CreepController,
        switcher: ReturnCodeSwitcher<any>,
        target: { pos: RoomPosition, id: string }
    ): void {
        switcher
            .on(ERR_NOT_IN_RANGE, () => {
                creepCtl.moveTo(target).logFailure();
            })
            .on(ERR_FULL, () => {
                logger.debug(`${creepCtl}: Creep is full - task is completed.`);
            })
            .on(ERR_NOT_ENOUGH_RESOURCES, () => {
                if (this.lastFetchTargetId && this.roomResourceLock) {
                    // if resources were locked and the source is depleted, the creep will start looking for a new source.
                    // release the lock on the resources of this source and clear up locked amount.
                    resourceLock.release('resources', this.roomResourceLock, this.lastFetchTargetId, this.lockedAmount || 0, creepCtl.creep.name);
                    this.lockedAmount = 0;
                }
                logger.debug(`${creepCtl}: Target is empty - will try again.`);
            })
            .on(ERR_INVALID_TARGET, () => {
                logger.failure(ERR_INVALID_TARGET, `${creepCtl}: Invalid target: ${target}`);
                this.excludedPositions.push(target.pos);
            })
            .logFailure();
    }

    public completed(creepCtl: CreepController): boolean {
        return creepCtl.creep.store.getFreeCapacity() === 0;
    }

    public onComplete(creepCtl: CreepController | undefined) {
        if (creepCtl && this.lastFetchTargetId && this.roomResourceLock) {
            resourceLock.release('resources', this.roomResourceLock, this.lastFetchTargetId, this.lockedAmount || 0, creepCtl.creep.name);
        }
    }

    public onInterrupt(id: string) {
        super.onInterrupt(id);
        if (this.lastFetchTargetId && this.roomResourceLock) {
            resourceLock.release('resources', this.roomResourceLock, this.lastFetchTargetId, this.lockedAmount || 0, id);
        }
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
            lockedAmount: this.lockedAmount,
            roomResourceLock: this.roomResourceLock,
            ...json,
        };
        return memory;
    }
}
