import { CreepController } from "agents/controllers/CreepController";
import { BaseCreepTask } from "tasks/creep/BaseCreepTask";
import { findNearbyMostDamaged } from "utils/findHelpers";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("tasks.creep.Repair", COLORS.tasks);

// stop repairing ramparts that have more hitpoints than that and consider other construction sites
export const RAMPART_INITIAL_REPAIR_HITS_TARGET = 10000;
export const RAMPART_SUBSEQUENT_REPAIR_HITS_TARGET = 250000; // TODO: make this function of the RCL?
export const IGNORE_REPAIR_TARGET_ABOVE_HITS_PC = 80;

/**
 * Repair task - go pick a low health target and repair it fully (or until energy storage is depleted)
 */
export class Repair extends BaseCreepTask {
    // when on, task is complete - only useful during the current turn, saving in task memory is not needed
    private noMoreTarget: boolean = false;
    private forced: boolean = false;
    private currentTarget?: string;

    constructor({ forced, currentTarget }: { forced?: boolean; currentTarget?: string } = {}) {
        super({ type: "TASK_REPAIR" });
        this.forced = forced || false;
        this.currentTarget = currentTarget;
    }

    public canBeExecuted(creepCtl: CreepController) {
        return creepCtl.creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
    }

    public execute(creepCtl: CreepController) {
        const target = this.getTarget(creepCtl);

        if (target !== null) {
            logger.debug(
                `${creepCtl}: Repairing damaged target building: ${target} (${target.hits} hits/ ${target.hitsMax} total}`,
            );
            creepCtl
                .repair(target)
                .on(ERR_NOT_IN_RANGE, () => {
                    creepCtl.moveTo(target).logFailure();
                })
                .on(ERR_INVALID_TARGET, () => {
                    logger.debug(`${creepCtl}: target ${target} is fully repaired.`);
                    if (this.currentTarget) {
                        this.currentTarget = undefined;
                    }
                })
                .on(ERR_NOT_ENOUGH_RESOURCES, () => {
                    logger.debug(`${creepCtl}: No more energy - task is completed.`);
                })
                .logFailure();
        } else {
            logger.debug(`${creepCtl}: No damaged building the current creep room`);

            this.noMoreTarget = true;
            return;
        }
    }

    private getTarget(creepCtl: CreepController): Structure | null {
        if (this.currentTarget) {
            const currentTarget = Game.getObjectById(this.currentTarget) as Structure;
            if (currentTarget && currentTarget.hits < currentTarget.hitsMax) {
                return currentTarget;
            }
        }
        const newTarget = this.findTarget(creepCtl);
        if (newTarget) {
            this.currentTarget = newTarget.id;
        }
        return newTarget;
    }

    /**
     * Find a suitable target for repair.
     * @param creepCtl controller for the creep executing the task
     */
    private findTarget(creepCtl: CreepController): Structure | null {
        let constructionSite: ConstructionSite | null = null;
        let noConstructionSiteFound = false;
        const customFilter = ({
            structureType,
            hits,
            hitsMax,
        }: {
            structureType?: StructureConstant;
            hits: number;
            hitsMax: number;
        }) => {
            // reject any structure with more hitpoints than the repair threshold
            if (hits > (IGNORE_REPAIR_TARGET_ABOVE_HITS_PC * hitsMax) / 100) {
                return false;
            }

            // accept any structure that isn't a rampart
            if (structureType !== STRUCTURE_RAMPART) {
                return true;
            }

            // if forced, keep pouring energy into any found target
            if (this.forced) {
                return hits < RAMPART_SUBSEQUENT_REPAIR_HITS_TARGET;
            }

            // for ramparts, accept any with significantly low health
            if (hits < RAMPART_INITIAL_REPAIR_HITS_TARGET) {
                return true;
            }
            // reject ramparts if there are construction sites
            if (constructionSite) {
                return false;
            }

            // don't do the same find query twice:
            // if no construction site could be found the first time it won't happen this time either
            if (noConstructionSiteFound) {
                return hits < RAMPART_SUBSEQUENT_REPAIR_HITS_TARGET;
            }

            // now look for construction sites - accept the rampart if none can be found
            // TODO[OPTIMIZATION]: query the room planner instead of doing an expensive room find call
            constructionSite = creepCtl.creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES);
            if (!constructionSite) {
                noConstructionSiteFound = true;
                return hits < RAMPART_SUBSEQUENT_REPAIR_HITS_TARGET;
            }
            return false;
        };
        const nearby = findNearbyMostDamaged(creepCtl.creep.pos, FIND_STRUCTURES, 10, customFilter) as Structure;
        const nearbyOwned = nearby as OwnedStructure;
        if (
            nearby &&
            (nearbyOwned.my || nearby.structureType === STRUCTURE_CONTAINER || nearby.structureType === STRUCTURE_ROAD)
        ) {
            return nearby;
        }
        return null;
    }

    public toJSON(): RepairTaskMemory {
        const json = super.toJSON();
        const memory: RepairTaskMemory = { forced: this.forced, currentTarget: this.currentTarget, ...json };
        return memory;
    }

    public completed(creepCtl: CreepController) {
        if (this.noMoreTarget || creepCtl.creep.store.getUsedCapacity() === 0) {
            return true;
        }
        return false;
    }

    public description() {
        return "🚧";
    }
}
