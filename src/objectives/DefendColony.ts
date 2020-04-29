import { CreepAgent } from "agents/CreepAgent";
import { RoomPlanner } from "colony/RoomPlanner";
import { Attack, RangedAttack } from "tasks/creep/Attack";
import { Heal } from "tasks/creep/Heal";
import { Reach } from "tasks/creep/Reach";
import { COLORS, getLogger } from "utils/Logger";
import { BaseObjective } from "./BaseObjective";

const logger = getLogger("objectives.DefendColony", COLORS.objectives);

const NB_HEALERS = 2;
const NB_MELEE = 2;
const NB_RANGED = 4;
const NB_TOTAL = NB_HEALERS + NB_MELEE + NB_RANGED;

const FIND_HOSTILES = [
    FIND_HOSTILE_CREEPS,
    FIND_HOSTILE_POWER_CREEPS,
    FIND_HOSTILE_SPAWNS,
    FIND_HOSTILE_STRUCTURES,
    // FIND_HOSTILE_CONSTRUCTION_SITES,
];

/**
 * Defend the colony by maintaining a fixed size battalion of attackers of different kinds and
 * when the battalion is complete, sending them all at once towards detected enemies.
 */
export class DefendColony extends BaseObjective {
    public name: ObjectiveType = "DEFEND_COLONY";

    constructor(battalionId: keyof ColonyBattalionsMemory) {
        super(battalionId);
    }

    public execute(creepAgents: CreepAgent[], room: RoomPlanner) {
        logger.debug(`Executing ${this}`);
        const { defenderGarrison } = room.roomPlan.plan;

        // healers are always healing those who need it
        for (const creep of creepAgents) {
            if (creep.profile === "Healer" && creep.taskQueue.length === 0) {
                creep.scheduleTask(new Heal());
            }
        }

        // TODO: self-defense tasks?
        const availableAttackers = creepAgents.filter(
            creep =>
                creep.profile !== "Healer" &&
                !creep.taskQueue.find(t => t.type === "TASK_ATTACK" || t.type === "TASK_RANGED_ATTACK"),
        );

        // don't schedule any new attack until we have a fully formed battalion
        if (creepAgents.length < NB_TOTAL) {
            if (Game.time % 10 === 0) {
                logger.info(
                    `Waiting for requested battalion to be fully formed (${creepAgents.length}/${NB_TOTAL} creeps)`,
                );
            }
        } else {
            for (const FIND_C of FIND_HOSTILES) {
                const hostiles = room.room.roomController?.room.find(FIND_C);
                if (hostiles && hostiles.length > 0 && hostiles[0].hits > 0) {
                    for (const creep of availableAttackers) {
                        if (creep.profile === "R-Attacker") {
                            creep.scheduleTask(new RangedAttack(hostiles[0].id));
                        } else if (creep.profile === "M-Attacker") {
                            creep.scheduleTask(new Attack(hostiles[0].id));
                        }
                    }

                    break;
                }
            }
        }

        if (!defenderGarrison) {
            logger.warning("No defender garrison - place a flag named 'Garrison' at the appropriate location");
            return;
        }

        // for each creep not currently attacking or already executing reach, reach back to the garrison
        // TODO: make so that the healers aren't sent back either after we launch an attack
        for (const creep of creepAgents) {
            const creepPos = creep.creepController?.creep.pos;
            if (
                !creep.taskQueue.find(
                    t => t.type === "TASK_ATTACK" || t.type === "TASK_RANGED_ATTACK" || t.type === "TASK_REACH",
                ) &&
                creepPos &&
                creepPos.getRangeTo(defenderGarrison.x, defenderGarrison.y) > 5
            ) {
                creep.scheduleTask(new Reach(defenderGarrison));
            }
        }
    }

    public estimateRequiredWorkForce(room: RoomPlanner): SpawnRequest[] {
        // TODO: make it a function of the number of hostiles?
        return [
            { count: NB_HEALERS, battalion: this.battalionId, creepProfile: "Healer" },
            { count: NB_MELEE, battalion: this.battalionId, creepProfile: "M-Attacker" },
            { count: NB_RANGED, battalion: this.battalionId, creepProfile: "R-Attacker" },
        ];
    }
}
