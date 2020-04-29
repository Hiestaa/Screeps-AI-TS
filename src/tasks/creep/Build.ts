import { CreepController } from "agents/controllers/CreepController";
import { BaseCreepTask } from "tasks/creep/BaseCreepTask";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("tasks.creep.Build", COLORS.tasks);

/**
 * Build task - go build to closest available construction site.
 */
export class Build extends BaseCreepTask {
    // when on, task is complete - only useful during the current turn, saving in task memory is not needed
    private noMoreTarget: boolean = false;
    private earlyInterruption: boolean = false;
    private buildPriority: STRUCTURE_X[];

    /**
     *
     * @param buildPriority array of structure types first come first serve.
     */
    constructor(buildPriority: STRUCTURE_X[] = []) {
        super("TASK_BUILD");
        this.buildPriority = buildPriority || [];
    }

    public canBeExecuted(creepCtl: CreepController) {
        return creepCtl.creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
    }

    public execute(creepCtl: CreepController) {
        const targets = creepCtl.creep.room.find(FIND_MY_CONSTRUCTION_SITES); // TODO: filter the ones that are full (if that makes sense)
        if (targets.length <= 0) {
            logger.debug(`No construction site available in the current creep room`);
            this.noMoreTarget = true;
            return;
        }
        return this.buildTargets(creepCtl, this.sortTargets(creepCtl, targets));
    }

    private buildTargets(creepCtl: CreepController, targets: ConstructionSite[], attempt: number = 0) {
        if (targets.length === 0) {
            logger.info(`${creepCtl}: All construction sites are fully built`);
            this.noMoreTarget = true;
        }
        creepCtl
            .build(targets[0])
            .on(OK, () => {
                // rampart get built with a single hit point - need to repair it fully
                // before starting the build of another site otherwise it'll decay right away
                if (targets[0].structureType === STRUCTURE_RAMPART) {
                    logger.debug(
                        `${creepCtl}: Constructed rampart ${targets[0]}. ` +
                            `Interrupting build task to proceed with the repair.`,
                    );
                    this.earlyInterruption = true;
                }
            })
            .on(ERR_NOT_IN_RANGE, () => {
                creepCtl.moveTo(targets[0]).logFailure();
            })
            .on(ERR_RCL_NOT_ENOUGH, () => {
                logger.debug(`${creepCtl}: Attempt #${attempt}: RCL not enough to build target ${targets[0]}.`);
                this.buildTargets(creepCtl, targets.slice(1), attempt + 1);
            })
            .on(ERR_INVALID_TARGET, () => {
                logger.debug(`${creepCtl}: Attempt #${attempt}: target ${targets[0]} is fully built.`);
                // rampart get built with a single hit point - need to repair it fully
                // before starting the build of another site otherwise it'll decay right away
                if (targets[0].structureType === STRUCTURE_RAMPART) {
                    logger.debug(`Interrupting build task to proceed with the repair.`);
                    this.earlyInterruption = true;
                } else {
                    this.buildTargets(creepCtl, targets.slice(1), attempt + 1);
                }
            })
            .on(ERR_NOT_ENOUGH_RESOURCES, () => {
                logger.debug(`${creepCtl}: No more energy - task is completed.`);
            })
            .logFailure();
    }

    /**
     * Sort the targets by the following rules in order:
     * 1. Prefer a target of the type seen earlier in the deliveryTarget array
     * 2. Prefer a target of closer distance
     * It is assumed that all targets should have available capacity.
     * TODO[OPTIMIZATION]: instead of sorting all possible target by distance, make a `getClosestInRange`
     * with filter for each priority type so we don't compute distance as many times (I guess)
     * @param creepCtl creep controller used to compute distances
     * @param targets targets to sort
     */
    private sortTargets(creepCtl: CreepController, targets: ConstructionSite[]): ConstructionSite[] {
        const distances: { [key: string]: number } = {};
        for (const target of targets) {
            distances[target.id] = creepCtl.creep.pos.getRangeTo(target);
        }
        const priorities: { [key: string]: number } = {};
        for (const target of targets) {
            priorities[target.id] = this.buildPriority.indexOf(target.structureType);
            if (priorities[target.id] === -1) {
                priorities[target.id] = this.buildPriority.length;
            }
        }

        // sort primarily by priority - among items of the same priority, pick the closest to completion,
        // and among the same the same level of completion pick the closest one by distance.
        targets.sort((t1: ConstructionSite, t2: ConstructionSite) => {
            if (priorities[t1.structureType] !== priorities[t2.structureType]) {
                return priorities[t1.structureType] - priorities[t2.structureType];
            }
            if (t1.progress > 100 || t2.progress > 100) {
                const remainingT1 = t1.progressTotal - t1.progress;
                const remainingT2 = t2.progressTotal - t2.progress;
                return remainingT1 - remainingT2;
            }
            return distances[t1.id] - distances[t2.id];
        });
        return targets;
    }

    public completed(creepCtl: CreepController) {
        return this.noMoreTarget || this.earlyInterruption || creepCtl.creep.store.getUsedCapacity() === 0;
    }

    public toJSON(): BuildTaskMemory {
        const json = super.toJSON();
        const memory: BuildTaskMemory = { buildPriority: this.buildPriority, ...json };
        return memory;
    }

    public description() {
        return "🚧";
    }
}
