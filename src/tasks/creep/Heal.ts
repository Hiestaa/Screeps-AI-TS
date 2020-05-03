import { CreepController } from "agents/controllers/CreepController";
import { BaseCreepTask } from "tasks/creep/BaseCreepTask";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("tasks.creep.Heal", COLORS.tasks);

/**
 * Simple heal task - go heal the closest damaged creep with a higher priority on lower health creeps
 * This task never completes. The controlled creep will keep following the last healed creep
 * until there is a new creep to heal.
 */
export class Heal extends BaseCreepTask {
    public currentTarget: string | undefined;
    public following: string | undefined;
    public noMoreTarget: boolean = false;

    constructor(following?: string, currentTarget?: string) {
        super("TASK_HEAL");
        this.currentTarget = currentTarget;
        this.following = following;
    }

    public canBeExecuted(creepCtl: CreepController) {
        return true;
    }

    public execute(creepCtl: CreepController) {
        const target = this.pickTargetToHeal(creepCtl);
        if (!target) {
            this.noMoreTarget = true;
            if (this.following) {
                const follow = Game.getObjectById(this.following) as Creep;
                if (follow) {
                    this.noMoreTarget = false;
                    creepCtl.moveTo(follow);
                }
            }
            return;
        }

        if (creepCtl.creep.pos.getRangeTo(target) > 1) {
            return creepCtl
                .rangedHeal(target)
                .on(OK, () => {
                    // does this take priority over rangedHeal? If yes, creep will never actually heal at range
                    creepCtl.moveTo(target).logFailure();
                })
                .on(ERR_NOT_IN_RANGE, () => {
                    creepCtl.moveTo(target).logFailure();
                });
        }

        return creepCtl
            .heal(target)
            .on(ERR_NOT_IN_RANGE, () => {
                creepCtl.moveTo(target).logFailure();
            })
            .logFailure();
    }

    private pickTargetToHeal(creepCtl: CreepController): Creep | null {
        let currentTarget = null;
        if (this.currentTarget) {
            currentTarget = Game.getObjectById(this.currentTarget) as Creep;
            if (currentTarget && currentTarget.hits < currentTarget.hitsMax) {
                return currentTarget;
            }
        }

        const hpGranularity = 10;
        for (let index = 0; index < hpGranularity; index++) {
            const target = creepCtl.creep.pos.findClosestByRange(FIND_MY_CREEPS, {
                filter: creep => creep.hits < (index / hpGranularity) * creep.hitsMax,
            });
            if (target) {
                this.currentTarget = target.id;
                return target;
            }
        }

        if (currentTarget !== null) {
            logger.info(`${creepCtl}: No target to heal - following last healed target: ${currentTarget}`);
            creepCtl.moveTo(currentTarget).logFailure();
        }

        // TODO: pause for a few cycles before completing the task.
        logger.debug(`${creepCtl}: No target to heal or to follow - nothing to do.`);
        return null;
    }

    public toJSON(): HealTaskMemory {
        const json = super.toJSON();
        const memory: HealTaskMemory = { currentTarget: this.currentTarget, following: this.following, ...json };
        return memory;
    }

    public completed(creepCtl: CreepController) {
        return this.noMoreTarget;
    }

    public description() {
        return "💊";
    }
}
