import { CreepController } from "agents/controllers/CreepController";
import { BaseCreepTask } from "tasks/creep/BaseCreepTask";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("tasks.creep.Haul", COLORS.tasks);

// except if storage is the last destination, we don't want to keep pumping energy into storage for no reason when containers are empty
const STORAGE_ENERGY_CAP = 2000;

/**
 * Simple Haul task - go Haul resources to the first available delivery target with priority order.
 */
export class Haul extends BaseCreepTask {
    private deliveryTargets: DeliveryTarget[];
    private excludedPositions: Array<{ x: number; y: number }>;

    constructor({ deliveryTargets, excludedPositions }: {
        deliveryTargets: DeliveryTarget[],
        excludedPositions?: Array<{ x: number; y: number }>
    }) {
        super({ type: "TASK_HAUL" });
        this.deliveryTargets = deliveryTargets;
        this.excludedPositions = excludedPositions || [];
    }

    public canBeExecuted(creepCtl: CreepController) {
        return creepCtl.creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
    }

    public execute(creepCtl: CreepController, attempt = 0) {
        const target = this.findTarget(creepCtl);
        if (!target) {
            return;
        }
        return this.transferToTarget(creepCtl, target, attempt);
    }

    private findTarget(creepCtl: CreepController): Structure | undefined {
        const lastFetchTargetId = this.prevTaskPersist?.lastFetchTargetId;
        const commonFilter = ({ pos, id }: { pos: RoomPosition; id: string }) => {
            return (
                !this.excludedPositions.find(({ x, y }) => x === pos.x && y === pos.y) &&
                (!lastFetchTargetId || id !== lastFetchTargetId)
            );
        };
        for (let targetTypeIdx = 0; targetTypeIdx < this.deliveryTargets.length; targetTypeIdx++) {
            const target = this.deliveryTargets[targetTypeIdx];

            switch (target) {
                case STRUCTURE_SPAWN:
                    const spawn = creepCtl.creep.pos.findClosestByRange(FIND_MY_SPAWNS, {
                        filter: spawnStruct =>
                            spawnStruct.energy < spawnStruct.energyCapacity && commonFilter(spawnStruct),
                    });
                    if (spawn) {
                        return spawn;
                    }
                    break;
                case STRUCTURE_CONTROLLER:
                    const controller = creepCtl.creep.room.controller;
                    if (controller && commonFilter(controller)) {
                        return controller;
                    }
                    break;
                case STRUCTURE_EXTENSION:
                case STRUCTURE_TOWER:
                    const towerOrExtension = creepCtl.creep.pos.findClosestByRange(FIND_STRUCTURES, {
                        filter: structure =>
                            structure.structureType === target &&
                            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
                            commonFilter(structure),
                    });
                    if (towerOrExtension) {
                        return towerOrExtension;
                    }
                    break;
                case STRUCTURE_CONTAINER:
                    const container = creepCtl.creep.pos.findClosestByRange(FIND_STRUCTURES, {
                        filter: structure =>
                            structure.structureType === target &&
                            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
                            commonFilter(structure),
                    });
                    if (container) {
                        return container;
                    }
                    break;
                case STRUCTURE_STORAGE:
                    const storage = creepCtl.creep.pos.findClosestByRange(FIND_STRUCTURES, {
                        filter: structure => {
                            const isProperStructure = structure.structureType === STRUCTURE_STORAGE;
                            if (structure.structureType !== STRUCTURE_STORAGE) {
                                return false;
                            }
                            const freeCap = isProperStructure && structure.store.getFreeCapacity(RESOURCE_ENERGY);
                            const usedCap = structure.store.getUsedCapacity(RESOURCE_ENERGY);
                            const isNotFull = freeCap > 0;
                            const needsUrgentRefill = usedCap < STORAGE_ENERGY_CAP;
                            const isLastItem = targetTypeIdx === this.deliveryTargets.length - 1;

                            return (
                                isProperStructure &&
                                isNotFull &&
                                ((!isLastItem && needsUrgentRefill) || isLastItem) &&
                                commonFilter(structure)
                            );
                        },
                    });
                    if (storage) {
                        return storage;
                    }
                    break;
            }
        }

        logger.debug(
            `No ${this.deliveryTargets.join("/")} available in the current creep room - pausing for 20 ticks.`,
        );
        const spawns = creepCtl.creep.room.find(FIND_MY_SPAWNS);
        this.pause(20);

        // TODO: consider moving towards0 the garrison, or a different area dedicated to idle creeps
        // to avoid too many creeps blocking the spawn?
        if (spawns.length > 0) {
            creepCtl.moveTo(spawns[0]).logFailure();
        }
        return;
    }

    private transferToTarget(creepCtl: CreepController, target: Structure, attempt: number = 0) {
        creepCtl
            .transfer(target, RESOURCE_ENERGY)
            .on(ERR_NOT_IN_RANGE, () => {
                creepCtl.moveTo(target).logFailure();
            })
            .on(ERR_NOT_ENOUGH_ENERGY, () => {
                logger.debug(`${creepCtl}: No more energy - task is completed.`);
            })
            .on(ERR_FULL, () => {
                logger.debug(`${creepCtl}: Attempt #${attempt}: target ${target} is full.`);
                this.execute(creepCtl, attempt + 1);
            })
            .logFailure();
    }

    public completed(creepCtl: CreepController) {
        return creepCtl.creep.store.getUsedCapacity() === 0;
    }

    public description() {
        return "👜";
    }

    public toJSON(): HaulTaskMemory {
        const json = super.toJSON();
        const memory: HaulTaskMemory = {
            deliveryTargets: this.deliveryTargets,
            excludedPositions: this.excludedPositions,
            ...json,
        };
        return memory;
    }
}
