import { TowerController } from "agents/controllers/TowerController";
import { BaseTask } from "tasks/BaseTask";
import { findNearbyMostDamaged } from "utils/findHelpers";
import { COLORS, getLogger } from "utils/Logger";
import { WARN_FREQUENCY } from "../constants";

const logger = getLogger("tasks.TowerTask", COLORS.tasks);

const DEFENSE_RADIUS = 10;

const customFilter = (towerCtl: TowerController) => ({ pos }: { pos: RoomPosition }) => {
    return towerCtl.tower.pos.getRangeTo(pos) <= DEFENSE_RADIUS;
};
export class TowerTask extends BaseTask<StructureTower, TowerController> {
    private currentHealTarget?: string;
    private currentAttackTarget?: string;
    private currentRepairTarget?: string;
    constructor(memory?: TowerTaskMemory) {
        super();
        if (memory) {
            this.currentHealTarget = memory?.currentHealTarget;
            this.currentAttackTarget = memory?.currentAttackTarget;
            this.currentRepairTarget = memory?.currentRepairTarget;
        }
    }

    public execute(towerCtl: TowerController) {
        if (!this.heal(towerCtl)) {
            if (!this.attack(towerCtl)) {
                if (!this.repair(towerCtl)) {
                    if (Game.time % WARN_FREQUENCY === 0) {
                        logger.warning(`${towerCtl}: Nothing to heal, attack or repair.`);
                    }
                }
            }
        }
    }

    private heal(towerCtl: TowerController): boolean {
        if (this.currentHealTarget) {
            const healTarget = Game.getObjectById(this.currentHealTarget) as Creep;
            if (healTarget && healTarget.hits > 0 && healTarget.hits < healTarget.hitsMax) {
                towerCtl.heal(healTarget);
                return true;
            }
        }
        const toHeal = findNearbyMostDamaged(towerCtl.tower.pos, FIND_MY_CREEPS, 10, customFilter(towerCtl)) as Creep;
        if (toHeal) {
            this.currentHealTarget = toHeal.id;
            towerCtl.heal(toHeal);
            return true;
        }
        return false;
    }

    private attack(towerCtl: TowerController): boolean {
        if (this.currentAttackTarget) {
            const attackTarget = Game.getObjectById(this.currentAttackTarget) as Creep;
            if (attackTarget && attackTarget.hits > 0) {
                towerCtl.attack(attackTarget);
                return true;
            }
        }
        const toKill = findNearbyMostDamaged(
            towerCtl.tower.pos,
            FIND_HOSTILE_CREEPS,
            10,
            customFilter(towerCtl),
        ) as Creep;
        if (toKill) {
            this.currentAttackTarget = toKill.id;
            towerCtl.attack(toKill);
            return true;
        }
        return false;
    }

    private repair(towerCtl: TowerController): boolean {
        if (this.currentRepairTarget) {
            const repairTarget = Game.getObjectById(this.currentRepairTarget) as Structure;
            if (repairTarget && repairTarget.hits > 0) {
                towerCtl.repair(repairTarget);
                return true;
            }
        }
        const toFix = findNearbyMostDamaged(
            towerCtl.tower.pos,
            FIND_MY_STRUCTURES,
            10,
            customFilter(towerCtl),
        ) as Structure;
        if (toFix) {
            this.currentRepairTarget = toFix.id;
            towerCtl.repair(toFix);
            return true;
        }
        return false;
    }

    public completed() {
        return false;
    }

    public toJSON(): TaskMemory {
        return {
            currentHealTarget: this.currentHealTarget,
            currentAttackTarget: this.currentAttackTarget,
            currentRepairTarget: this.currentRepairTarget,
            type: "TASK_TOWER",
            executionStarted: this.executionStarted,
            executionPaused: this.executionPaused,
        };
    }

    public getType(): "TASK_TOWER" {
        return "TASK_TOWER";
    }
}
