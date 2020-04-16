import { CreepAgent } from "agents/CreepAgent";
import { SpawnAgent } from "agents/SpawnAgent";
import { IAgentStore } from "phases/IAgentStore";
import { Build } from "tasks/creep/Build";
import { Harvest } from "tasks/creep/Harvest";
import { Haul } from "tasks/creep/Haul";
import { SpawnTask } from "tasks/Spawn";
import { COLORS, getLogger } from "utils/Logger";
import { BaseObjective, OBJECTIVE_TYPE } from "./IObjective";

const logger = getLogger("objectives.ReachRCL1", COLORS.objectives);

const MAX_HAUL_TO_SPAWN = 2;

export class ReachRCL1 extends BaseObjective {
    protected name: OBJECTIVE_TYPE = "REACH_RCL1";

    public execute(agentStore: IAgentStore) {
        for (const spawnName in agentStore.spawns) {
            if (!agentStore.spawns.hasOwnProperty(spawnName)) {
                continue;
            }

            const spawnAgent = agentStore.spawns[spawnName];
            this.assignSpawnTasks(spawnAgent);
        }

        for (const creepName in agentStore.creeps) {
            if (!agentStore.creeps.hasOwnProperty(creepName)) {
                continue;
            }

            const creepAgent = agentStore.creeps[creepName];
            this.assignCreepTasks(creepAgent);
        }

        return this;
    }

    private assignSpawnTasks(spawnAgent: SpawnAgent) {
        logger.debug(`${this}: ensuring ${spawnAgent} has task TASK_SPAWN scheduled`);
        if (!spawnAgent.hasTaskScheduled("TASK_SPAWN")) {
            spawnAgent.scheduleTask(new SpawnTask(5));
        }
    }

    private assignCreepTasks(creepAgent: CreepAgent) {
        logger.debug(`${this}: ensuring ${creepAgent} has tasks TASK_HARVEST and TASK_HAUL scheduled`);
        if (!creepAgent.hasTaskScheduled("TASK_HARVEST")) {
            creepAgent.scheduleTask(new Harvest());
        }

        if (!creepAgent.hasTaskScheduled("TASK_HAUL")) {
            creepAgent.scheduleTask(new Haul([STRUCTURE_SPAWN]));
        }

        if (!creepAgent.hasTaskScheduled("TASK_BUILD")) {
            creepAgent.scheduleTask(new Build());
        }

        if (!creepAgent.hasTaskScheduled("TASK_HAUL")) {
            creepAgent.scheduleTask(new Haul([STRUCTURE_SPAWN, STRUCTURE_CONTAINER, STRUCTURE_CONTROLLER]));
        }
    }
}
