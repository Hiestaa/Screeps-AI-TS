import { CreepAgent } from "agents/CreepAgent";
import { RoomPlanner } from "colony/RoomPlanner";
import { Build } from "tasks/creep/Build";
import { Fetch } from "tasks/creep/Fetch";
import { Haul } from "tasks/creep/Haul";
import { Repair } from "tasks/creep/Repair";
import { UpgradeController } from "tasks/creep/UpgradeController";
import { COLORS, getLogger } from "utils/Logger";
import { BaseObjective } from "./BaseObjective";
import { CONTROLLER_DOWNGRADE_TIMER_LEVEL } from "./ReachRCL3";

const logger = getLogger("objectives.DefendColony", COLORS.objectives);

const NB_HEALERS = 4;
const NB_MELEE = 4;
const NB_RANGED = 6;
const NB_TOTAL = NB_HEALERS + NB_MELEE + NB_RANGED;

const FIND_HOSTILES = [
    FIND_HOSTILE_CREEPS,
    FIND_HOSTILE_POWER_CREEPS,
    FIND_HOSTILE_SPAWNS,
    FIND_HOSTILE_STRUCTURES,
    FIND_HOSTILE_CONSTRUCTION_SITES,
];

/**
 * Defend the colony by maintaining a fixed size battalion of attackers of different kinds and
 * when the battalion is complete, sending them all at once towards detected enemies.
 */
export class DefendColony extends BaseObjective {
    public name: ObjectiveType = "DEFEND_COLONY";

    public execute(creepAgents: CreepAgent[], room: RoomPlanner) {
        logger.debug(`Executing ${this}`);

        const availableAgents = creepAgents.filter(agent => agent.taskQueue.length === 0);
        for (const FIND_C of FIND_HOSTILES) {
            const hostiles = room.room.roomController?.room.find(FIND_C);
            if (hostiles && hostiles.length > 0) {
                if (availableAgents.length < NB_TOTAL) {
                    logger.info(
                        `Waiting for requested battalion to be fully formed (${creepAgents.length}/${NB_TOTAL} creeps)`,
                    );
                    return;
                }

                for (const creep of creepAgents) {
                    // TODO: schedule attack, ranged attack or heal on the creep
                }
            }
        })
    }

    public estimateRequiredWorkForce(room: RoomPlanner): SpawnRequest[] {
        // TODO: make it a function of the number of hostiles?
        return [{ count: NB_MELEE, battalion: this.battalionId, creepProfile: "Attacker" }];
    }
}
