import { CreepAgent } from "agents/CreepAgent";
import { SpawnAgent } from "agents/SpawnAgent";
import { TowerAgent } from "agents/TowerAgent";
import { RoomPlanner } from "colony/RoomPlanner";
import { Attack, RangedAttack } from "tasks/creep/Attack";
import { Heal } from "tasks/creep/Heal";
import { Reach } from "tasks/creep/Reach";
import { TowerTask } from "tasks/TowerTask";
import { COLORS, getLogger } from "utils/Logger";
import { DEFEND_COLONY_REQUESTS_CREEPS_RCL, WARN_FREQUENCY } from "../constants";
import { BaseObjective } from "./BaseObjective";

const logger = getLogger("objectives.DefendColony", COLORS.objectives);

const NB_HEALERS = 2;
const NB_MELEE = 1;
const NB_RANGED = 2;
const NB_TOTAL = NB_HEALERS + NB_MELEE + NB_RANGED;
const SOURCE_KEEPER = "Source Keeper";

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
    private attackLaunched: boolean;

    constructor(battalionId: keyof ColonyBattalionsMemory, attackLaunched?: boolean) {
        super(battalionId);
        this.attackLaunched = attackLaunched || false;
    }

    public execute(creepAgents: CreepAgent[], roomPlanner: RoomPlanner, spawn: SpawnAgent, towers: TowerAgent[]) {
        logger.debug(`Executing ${this}`);

        this.scheduleMissingTowerTasks(towers);

        if (this.attackLaunched && creepAgents.length === 0) {
            // cancel attack if all agents have died
            this.attackLaunched = false;
        }

        const { defenderGarrison } = roomPlanner.roomPlan.plan;
        const { availableAttackers, leader } = this.splitAgentsByRole(creepAgents);

        // healers are always healing those who need it
        this.scheduleMissingHealTasks(creepAgents, leader);

        // don't schedule any new attack until we have a fully formed battalion
        this.attackLaunched = this.launchAttackIfReady(creepAgents, availableAttackers, roomPlanner);

        if (!defenderGarrison) {
            logger.warning("No defender garrison - place a flag named 'Garrison' at the appropriate location");
            return;
        }

        // for each creep not currently attacking or already executing reach, reach back to the garrison
        this.reachGarrison(creepAgents, defenderGarrison);
    }

    private scheduleMissingTowerTasks(towers: TowerAgent[]) {
        for (const tower of towers) {
            if (!tower.taskQueue.find(t => t.getType() === "TASK_TOWER")) {
                tower.scheduleTask(new TowerTask());
            }
        }
    }

    private splitAgentsByRole(creepAgents: CreepAgent[]) {
        const availableAttackers = creepAgents.filter(
            creep =>
                creep.profile !== "Healer" &&
                !creep.taskQueue.find(t => t.type === "TASK_ATTACK" || t.type === "TASK_RANGED_ATTACK"),
        );
        const attackers = creepAgents.filter(creep => creep.profile !== "Healer");
        const attacking = creepAgents.filter(creep =>
            creep.taskQueue.find(t => t.type === "TASK_ATTACK" || t.type === "TASK_RANGED_ATTACK"),
        );
        const leader =
            attacking.length > 0
                ? attacking[0]
                : attackers.length > 0
                    ? attackers[0]
                    : availableAttackers.length > 0
                        ? availableAttackers[0]
                        : undefined;

        return { availableAttackers, attackers, attacking, leader };
    }

    private scheduleMissingHealTasks(creepAgents: CreepAgent[], leader: CreepAgent | undefined) {
        for (const creep of creepAgents) {
            if (creep.profile === "Healer" && !creep.taskQueue.find(t => t.type === "TASK_HEAL")) {
                creep.scheduleTask(new Heal({ following: leader?.creepController?.creep.id || undefined }));
            }
        }
    }

    private launchAttackIfReady(
        creepAgents: CreepAgent[],
        availableAttackers: CreepAgent[],
        roomPlanner: RoomPlanner,
    ): boolean {
        let attackLaunched = this.attackLaunched;
        if (!attackLaunched && creepAgents.length < NB_TOTAL) {
            // TODO: self-defense tasks?
            if (Game.time % WARN_FREQUENCY === 0) {
                logger.info(
                    `Waiting for requested battalion to be fully formed (${creepAgents.length}/${NB_TOTAL} creeps)`,
                );
            }
        } else {
            let foundHostiles = false;
            for (const FIND_C of FIND_HOSTILES) {
                // Ignore anything belonging to the source keeper for now. It's not really a threat at the moment.
                const hostiles = roomPlanner.room.roomController?.room.find(FIND_C, {
                    filter: item => !item.owner || item.owner.username !== SOURCE_KEEPER,
                });
                if (hostiles && hostiles.length > 0 && hostiles[0].hits > 0) {
                    foundHostiles = true;

                    for (const creep of availableAttackers) {
                        if (creep.profile === "R-Attacker") {
                            creep.taskQueue = []; // focus attack - don't wait for completion of another task (e.g. reach)
                            creep.scheduleTask(new RangedAttack({ target: hostiles[0].id }));
                        } else if (creep.profile === "M-Attacker") {
                            creep.taskQueue = []; // focus attack - don't wait for completion of another task (e.g. reach)
                            creep.scheduleTask(new Attack({ target: hostiles[0].id }));
                        }
                    }

                    break;
                }
            }

            if (foundHostiles) {
                attackLaunched = true;
            }
        }

        return attackLaunched;
    }

    private reachGarrison(creepAgents: CreepAgent[], defenderGarrison: { x: number; y: number }) {
        for (const creep of creepAgents) {
            const creepPos = creep.creepController?.creep.pos;
            if (
                !creep.taskQueue.find(
                    t =>
                        t.type === "TASK_ATTACK" ||
                        t.type === "TASK_RANGED_ATTACK" ||
                        t.type === "TASK_REACH" ||
                        // TODO?: avoid that the healers to be sent back before we launch an attack? Does it matter?
                        t.type === "TASK_HEAL",
                ) &&
                creepPos &&
                creepPos.getRangeTo(defenderGarrison.x, defenderGarrison.y) > 5
            ) {
                creep.scheduleTask(new Reach({ destination: defenderGarrison }));
            }
        }
    }

    public estimateRequiredWorkForce(roomPlanner: RoomPlanner): SpawnRequest[] {
        // TODO: make it a function of the number of hostiles?
        const rcl = roomPlanner.room.roomController?.room.controller?.level;
        if (rcl && rcl < DEFEND_COLONY_REQUESTS_CREEPS_RCL) {
            return [];
        }
        return [
            { count: NB_HEALERS, battalion: this.battalionId, creepProfile: "Healer" },
            { count: NB_MELEE, battalion: this.battalionId, creepProfile: "M-Attacker" },
            { count: NB_RANGED, battalion: this.battalionId, creepProfile: "R-Attacker" },
        ];
    }

    public save(): DefendColonyMemory {
        const json = super.save();
        return { attackLaunched: this.attackLaunched, ...json };
    }
}
