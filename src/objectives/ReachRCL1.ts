import { CreepTaskExecutor } from "controllers/taskExecutors/CreepTaskExecutor";
import { SpawnTaskExecutor } from "controllers/taskExecutors/SpawnTaskExecutor";
import { ITaskExecutorStore } from "phases/ITaskExecutorStore";
import { Harvest } from "tasks/creep/Harvest";
import { Haul } from "tasks/creep/Haul";
import { SpawnTask } from "tasks/Spawn";
import { COLORS, getLogger } from "utils/Logger";
import { BaseObjective, OBJECTIVE_TYPE } from "./IObjective";

const logger = getLogger("objectives.ReachRCL1", COLORS.objectives);

const MAX_HAUL_TO_SPAWN = 2;

export class ReachRCL1 extends BaseObjective {
    protected name: OBJECTIVE_TYPE = "REACH_RCL1";

    public execute(controllerStore: ITaskExecutorStore) {
        for (const spawnName in controllerStore.spawns) {
            if (!controllerStore.spawns.hasOwnProperty(spawnName)) {
                continue;
            }

            const spawnTaskExecutor = controllerStore.spawns[spawnName];
            this.ensureSpawnTask(spawnTaskExecutor);
        }

        for (const creepName in controllerStore.creeps) {
            if (!controllerStore.creeps.hasOwnProperty(creepName)) {
                continue;
            }

            const creepTaskExecutor = controllerStore.creeps[creepName];
            this.ensureHarvestAndHaulTasks(creepTaskExecutor);
        }

        return this;
    }

    private ensureSpawnTask(spawnTaskExecutor: SpawnTaskExecutor) {
        logger.debug(`${this}: ensuring ${spawnTaskExecutor} has task TASK_SPAWN scheduled`);
        if (!spawnTaskExecutor.hasTaskScheduled("TASK_SPAWN")) {
            spawnTaskExecutor.scheduleTask(new SpawnTask(5));
        }
    }

    private ensureHarvestAndHaulTasks(creepTaskExecutor: CreepTaskExecutor) {
        logger.debug(`${this}: ensuring ${creepTaskExecutor} has tasks TASK_HARVEST and TASK_HAUL scheduled`);
        if (!creepTaskExecutor.hasTaskScheduled("TASK_HARVEST")) {
            creepTaskExecutor.scheduleTask(new Harvest());
        }

        if (!creepTaskExecutor.hasTaskScheduled("TASK_HAUL")) {
            creepTaskExecutor.scheduleTask(new Haul([STRUCTURE_SPAWN, STRUCTURE_CONTAINER, STRUCTURE_CONTROLLER]));
        }
    }
}
