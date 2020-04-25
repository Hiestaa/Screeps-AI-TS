import { CreepController } from "agents/controllers/CreepController";
import { BaseCreepTask } from "tasks/creep/BaseCreepTask";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("tasks.creep.Haul", COLORS.tasks);

/**
 * Simple Haul task - go Haul resources to the first available spawn
 * @param creepController controller for the creep that will perform this task
 */
export class Haul extends BaseCreepTask {
    private deliveryTargets: DeliveryTarget[];
    private excludedPositions: Array<{ x: number; y: number }>;
    private noMoreTarget: boolean = false;

    constructor(deliveryTargets: DeliveryTarget[], excludedPositions?: Array<{ x: number; y: number }>) {
        super("TASK_HAUL");
        this.deliveryTargets = deliveryTargets;
        this.excludedPositions = excludedPositions || [];
    }

    public canBeExecuted(creepCtl: CreepController) {
        return creepCtl.creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
    }

    public execute(creepCtl: CreepController) {
        const emptyTargets: Structure[] = [];
        const targets = emptyTargets.concat.apply(
            emptyTargets,
            this.deliveryTargets.map(target => this.findTargets(creepCtl, target)),
        );
        if (targets.length <= 0) {
            logger.debug(
                `No ${this.deliveryTargets.join("/")} available in the current creep room - pausing for 20 ticks.`,
            );
            const spawns = creepCtl.creep.room.find(FIND_MY_SPAWNS);
            if (spawns.length > 0) {
                creepCtl.moveTo(spawns[0]);
            }
            // FIXME: remember 'noMoreTarget' after pause this.pause(10);
            this.noMoreTarget = true;
            return;
        }
        return this.transferToTargets(creepCtl, this.sortTargets(creepCtl, targets));
    }

    private transferToTargets(creepCtl: CreepController, targets: Structure[], attempt: number = 0) {
        if (targets.length === 0) {
            logger.error(`${creepCtl}: All specified delivery targets ${this.deliveryTargets.join("/")} are full`);
            this.noMoreTarget = true;
        }
        // FIXME: if target is a controller we need to do `upgradeController` instead of `transfer`?
        creepCtl
            .transfer(targets[0], RESOURCE_ENERGY)
            .on(ERR_NOT_IN_RANGE, () => {
                creepCtl.moveTo(targets[0]).logFailure();
            })
            .on(ERR_NOT_ENOUGH_ENERGY, () => {
                logger.debug(`${creepCtl}: No more energy - task is completed.`);
            })
            .on(ERR_FULL, () => {
                logger.debug(`${creepCtl}: Attempt #${attempt}: target ${targets[0]} is full.`);
                this.transferToTargets(creepCtl, targets.slice(1), attempt + 1);
            })
            .logFailure();
    }

    private findTargets(creepCtl: CreepController, target: DeliveryTarget): Structure[] {
        const excPosFilter = ({ pos }: { pos: RoomPosition }) => {
            return !this.excludedPositions.includes({ x: pos.x, y: pos.x });
        };

        switch (target) {
            case STRUCTURE_SPAWN:
                return creepCtl.creep.room.find(FIND_MY_SPAWNS, {
                    filter: spawn => spawn.energy < spawn.energyCapacity && excPosFilter(spawn),
                });
            case STRUCTURE_CONTROLLER:
                const controller = creepCtl.creep.room.controller;
                return controller && excPosFilter(controller) ? [controller] : [];
            case STRUCTURE_CONTAINER:
                return creepCtl.creep.room.find(FIND_STRUCTURES, {
                    filter: structure =>
                        structure.structureType === STRUCTURE_CONTAINER &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
                        excPosFilter(structure),
                });
            case STRUCTURE_EXTENSION:
                return creepCtl.creep.room.find(FIND_STRUCTURES, {
                    filter: structure =>
                        structure.structureType === STRUCTURE_EXTENSION &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
                        excPosFilter(structure),
                });
        }
    }

    /**
     * Sort the targets by the following rules in order:
     * 1. Prefer a target of the type seen earlier in the deliveryTarget array
     * 2. Prefer a target of closer distance
     * It is assumed that all targets should have available capacity.
     * TODO: Test me
     * @param creepCtl creep controller used to compute distances
     * @param targets targets to sort
     */
    private sortTargets(creepCtl: CreepController, targets: Structure[]): Structure[] {
        const computeTargetRelevance = (target: Structure): number => {
            return (this.deliveryTargets as STRUCTURE_X[]).indexOf(target.structureType);
        };
        const distances: { [key: string]: number } = {};
        for (const target of targets) {
            distances[target.id] = creepCtl.creep.pos.getRangeTo(target);
        }
        const maxDist = Math.max.apply(
            null,
            Object.keys(distances).map(k => distances[k]),
        );
        targets.sort((t1: Structure, t2: Structure) => {
            const t1Relevance = computeTargetRelevance(t1) * maxDist;
            const t2Relevance = computeTargetRelevance(t2) * maxDist;
            return t1Relevance + distances[t1.id] - (t2Relevance + distances[t2.id]);
        });
        return targets;
    }

    public completed(creepCtl: CreepController) {
        return this.noMoreTarget || creepCtl.creep.store.getUsedCapacity() === 0;
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
