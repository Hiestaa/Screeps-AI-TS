import { CreepAgent } from "agents/CreepAgent";
import { SpawnAgent } from "agents/SpawnAgent";
import { IAgentStore } from "phases/IAgentStore";
import { Build } from "tasks/creep/Build";
import { Harvest } from "tasks/creep/Harvest";
import { Haul } from "tasks/creep/Haul";
import { SpawnTask } from "tasks/Spawn";
import { COLORS, getLogger } from "utils/Logger";
import { BaseObjective } from "./IObjective";
import { ReachRCL3 } from "./ReachRCL3";

const logger = getLogger("objectives.ReachRCL2", COLORS.objectives);

export class ReachRCL2 extends BaseObjective {
    public name: ObjectiveType = "REACH_RCL2";

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
    }

    private assignSpawnTasks(spawnAgent: SpawnAgent) {
        logger.debug(`${this}: ensuring ${spawnAgent} has task TASK_SPAWN scheduled`);
        if (!spawnAgent.hasTaskScheduled("TASK_SPAWN")) {
            spawnAgent.scheduleTask(new SpawnTask(5));
        }
    }

    private assignCreepTasks(creepAgent: CreepAgent) {
        logger.debug(`${this}: ensuring ${creepAgent} has all creep tasks scheduled`);
        if (!creepAgent.taskQueue.length) {
            creepAgent.scheduleTask(new Harvest());
            creepAgent.scheduleTask(new Haul([STRUCTURE_SPAWN]));
            creepAgent.scheduleTask(new Build());
            creepAgent.scheduleTask(new Haul([STRUCTURE_SPAWN, STRUCTURE_CONTROLLER, STRUCTURE_CONTAINER]));
        }
    }
}
