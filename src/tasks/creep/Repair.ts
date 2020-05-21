import { CreepController } from "agents/controllers/CreepController";
import { BaseCreepTask } from "tasks/creep/BaseCreepTask";
import { findNearbyMostDamaged } from "utils/findHelpers";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("tasks.creep.Repair", COLORS.tasks);

// stop repairing ramparts that have more hitpoints than that and consider other construction sites
export const RAMPART_INITIAL_REPAIR_HITS_TARGET = 10000;
/**
 * Simple Haul task - go Haul resources to the first available spawn
 */
export class Repair extends BaseCreepTask {
    // when on, task is complete - only useful during the current turn, saving in task memory is not needed
    private noMoreTarget: boolean = false;
    private forced: boolean = false;

    /**
     */
    constructor(forced?: boolean) {
        super("TASK_REPAIR");
        this.forced = forced || false;
    }

    public canBeExecuted(creepCtl: CreepController) {
        return creepCtl.creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
    }

    public execute(creepCtl: CreepController) {
        // TODO[OPTIMIZATION]: remember the target so we don't search for it at every tick
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

    /**
     * Find a suitable target for repair.
     * @param creepCtl controller for the creep executing the task
     */
    private getTarget(creepCtl: CreepController): Structure | null {
        let constructionSite: ConstructionSite | null = null;
        let noConstructionSiteFound = false;
        const customFilter = ({ structureType, hits }: { structureType?: StructureConstant; hits: number }) => {
            // accept any structure that isn't a rampart
            if (structureType !== STRUCTURE_RAMPART) {
                return true;
            }
            // if forced, keep pouring energy into any found target
            if (this.forced) {
                return true;
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
                return true;
            }

            // now look for construction sites - accept the rampart if none can be found
            // TODO[OPTIMIZATION]: query the room planner instead of doing an expensive room find call
            constructionSite = creepCtl.creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES);
            if (!constructionSite) {
                noConstructionSiteFound = true;
                return true;
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
        const memory: RepairTaskMemory = { forced: this.forced, ...json };
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
