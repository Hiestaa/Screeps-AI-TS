import { CreepController } from "agents/controllers/CreepController";
import { BaseCreepTask } from "tasks/creep/BaseCreepTask";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("tasks.creep.Haul", COLORS.tasks);

/**
 * Simple Haul task - go Haul resources to the first available spawn
 * @param creepController controller for the creep that will perform this task
 */
export class Build extends BaseCreepTask {
    // when on, task is complete - only useful during the current turn, saving in task memory is not needed
    private noMoreTarget: boolean = false;

    constructor() {
        super("TASK_BUILD");
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
            .on(ERR_NOT_IN_RANGE, () => {
                creepCtl.moveTo(targets[0]).logFailure();
            })
            .on(ERR_INVALID_TARGET, () => {
                logger.debug(`${creepCtl}: Attempt #${attempt}: target ${targets[0]} is fully built.`);
                this.buildTargets(creepCtl, targets.slice(1), attempt + 1);
            })
            .logFailure();
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
    private sortTargets(creepCtl: CreepController, targets: ConstructionSite[]): ConstructionSite[] {
        const distances: { [key: string]: number } = {};
        for (const target of targets) {
            distances[target.id] = creepCtl.creep.pos.getRangeTo(target);
        }
        // TODO: accept a build preference order - see how sorting is done in the Haul task
        // const maxDist = Math.max.apply(
        //     null,
        //     Object.keys(distances).map(k => distances[k]),
        // );
        targets.sort((t1: ConstructionSite, t2: ConstructionSite) => {
            return distances[t1.id] - distances[t2.id];
        });
        return targets;
    }

    public completed(creepCtl: CreepController) {
        return this.noMoreTarget || creepCtl.creep.store.getUsedCapacity() === 0;
    }

    public description() {
        return "🚧";
    }
}
