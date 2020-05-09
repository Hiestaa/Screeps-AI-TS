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
    private buildPriority: StructureConstant[];

    /**
     *
     * @param buildPriority array of structure types first come first serve.
     */
    constructor(buildPriority: StructureConstant[] = []) {
        super("TASK_BUILD");
        this.buildPriority = buildPriority || [];
    }

    public canBeExecuted(creepCtl: CreepController) {
        return creepCtl.creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
    }

    public execute(creepCtl: CreepController, attempt = 0, exclude: string[] = []) {
        const target = this.findTarget(creepCtl, exclude);
        if (!target) {
            logger.debug(`No construction site available in the current creep room`);
            this.noMoreTarget = true;
            return;
        }
        return this.buildTarget(creepCtl, target, attempt, exclude);
    }

    private findTarget(creepCtl: CreepController, exclude: string[]) {
        for (const structureType of this.buildPriority) {
            const closest = creepCtl.creep.pos.findClosestByRange(FIND_MY_CONSTRUCTION_SITES, {
                filter: constructionSite =>
                    constructionSite.structureType === structureType && !exclude.includes(constructionSite.id),
            });
            if (closest) {
                return closest;
            }
        }
        return creepCtl.creep.pos.findClosestByRange(FIND_MY_CONSTRUCTION_SITES, {
            filter: constructionSite => !exclude.includes(constructionSite.id),
        });
    }

    private buildTarget(creepCtl: CreepController, target: ConstructionSite, attempt: number = 0, exclude: string[]) {
        creepCtl
            .build(target)
            .on(OK, () => {
                // rampart get built with a single hit point - need to repair it fully
                // before starting the build of another site otherwise it'll decay right away
                if (target.structureType === STRUCTURE_RAMPART) {
                    logger.debug(
                        `${creepCtl}: Constructed rampart ${target}. ` +
                            `Interrupting build task to proceed with the repair.`,
                    );
                    this.earlyInterruption = true;
                }
            })
            .on(ERR_NOT_IN_RANGE, () => {
                const rampartToBuild = creepCtl.creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
                    filter: structure => structure.structureType === "rampart" && structure.hits < structure.hitsMax,
                });
                if (rampartToBuild) {
                    logger.warning(
                        `${creepCtl}: Interrupting build tasks - rampart ${rampartToBuild} needs construction.`,
                    );
                    this.earlyInterruption = true;
                    return;
                }

                creepCtl.moveTo(target).logFailure();
            })
            .on(ERR_RCL_NOT_ENOUGH, () => {
                logger.debug(`${creepCtl}: Attempt #${attempt}: RCL not enough to build target ${target}.`);
                exclude = exclude.concat([target.id]);
                this.execute(creepCtl, attempt + 1, exclude);
            })
            .on(ERR_INVALID_TARGET, () => {
                logger.debug(`${creepCtl}: Attempt #${attempt}: target ${target} is fully built.`);
                // rampart get built with a single hit point - need to repair it fully
                // before starting the build of another site otherwise it'll decay right away
                if (target.structureType === STRUCTURE_RAMPART) {
                    logger.debug(`Interrupting build task to proceed with the repair.`);
                    this.earlyInterruption = true;
                } else {
                    exclude = exclude.concat([target.id]);
                    this.execute(creepCtl, attempt + 1, exclude);
                }
            })
            .on(ERR_NOT_ENOUGH_RESOURCES, () => {
                logger.debug(`${creepCtl}: No more energy - task is completed.`);
            })
            .logFailure();
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
