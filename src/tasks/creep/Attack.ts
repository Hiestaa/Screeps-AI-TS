import { ReturnCodeSwitcher } from "agents/controllers/BaseController";
import { CreepController } from "agents/controllers/CreepController";
import { BaseCreepTask } from "tasks/creep/BaseCreepTask";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("tasks.creep.Attack", COLORS.tasks);

/**
 * Simple attack task - attack the designated target until the target or the controlled creep is dead
 * TODO: add support for attack priority, so the creep can dynamically switch from a lower priority attack to a higher priority task when scheduled
 * Should this be available as a base class mechanism?
 */
export class Attack extends BaseCreepTask {
    public target: string;
    private noMoreTarget: boolean = false;

    constructor({ target, type }: { target: string, type?: CREEP_TASK }) {
        super({ type: type || "TASK_ATTACK" });
        this.target = target;
    }

    public canBeExecuted(creepCtl: CreepController) {
        return true;
    }

    public execute(creepCtl: CreepController) {
        const target = this.getTarget(creepCtl);

        if (!target) {
            this.noMoreTarget = true;
            return;
        }

        this.attackTarget(creepCtl, target)
            .on(ERR_NOT_IN_RANGE, () => {
                creepCtl.moveTo(target).logFailure();
            })
            .logFailure();
    }

    private getTarget(creepCtl: CreepController): Creep | Structure | null {
        const target = Game.getObjectById(this.target) as Creep | Structure | undefined;
        if (target && target.hits > 0) {
            return target;
        }
        return null;
    }

    protected attackTarget(
        creepCtl: CreepController,
        target: Creep | Structure,
    ): ReturnCodeSwitcher<CreepActionReturnCode> {
        return creepCtl.attack(target);
    }

    public toJSON(): AttackTaskMemory {
        const json = super.toJSON();
        const memory: AttackTaskMemory = { target: this.target, ...json };
        return memory;
    }

    public completed(creepCtl: CreepController) {
        return this.noMoreTarget;
    }

    public description() {
        return "🗡️";
    }
}

export class RangedAttack extends Attack {
    constructor({ target }: { target: string }) {
        super({ target, type: "TASK_RANGED_ATTACK" });
    }

    protected attackTarget(
        creepCtl: CreepController,
        target: Creep | Structure,
    ): ReturnCodeSwitcher<CreepActionReturnCode> {
        return creepCtl.rangedAttack(target);
    }

    public description() {
        return "🏹";
    }
}
