import { CreepTaskExecutor } from "controllers/taskExecutors/CreepTaskExecutor";
import { SpawnTaskExecutor } from "controllers/taskExecutors/SpawnTaskExecutor";
import { IControllerStore } from "phases/IControllerStore";
import { Harvest } from "tasks/creep/Harvest";
import { Haul } from "tasks/creep/Haul";
import { SpawnTask } from "tasks/Spawn";
import { COLORS, getLogger } from "utils/Logger";
import { BaseObjective, OBJECTIVE_TYPE } from "./IObjective";

const logger = getLogger("objectives.ReachRCL1", COLORS.objectives);

export class ReachRCL1 extends BaseObjective {
    protected name: OBJECTIVE_TYPE = "REACH_RCL1";

    public execute(controllerStore: IControllerStore) {
        for (const spawnName in controllerStore.spawns) {
            if (!controllerStore.spawns.hasOwnProperty(spawnName)) {
                continue;
            }

            const spawnController = controllerStore.spawns[spawnName];
            this.ensureSpawnTask(spawnController);
        }

        for (const creepName in controllerStore.creeps) {
            if (!controllerStore.creeps.hasOwnProperty(creepName)) {
                continue;
            }

            const creepController = controllerStore.creeps[creepName];
            this.ensureHarvestAndHaulTasks(creepController);
        }

        return this;
    }

    private ensureSpawnTask(spawnController: SpawnTaskExecutor) {
        logger.debug(`${this}: ensuring ${spawnController} has task TASK_SPAWN scheduled`);
        if (!spawnController.hasTaskScheduled("TASK_SPAWN")) {
            spawnController.scheduleTask(new SpawnTask(100));
        }
    }

    private ensureHarvestAndHaulTasks(creepController: CreepTaskExecutor) {
        logger.debug(`${this}: ensuring ${creepController} has tasks TASK_HARVEST and TASK_HAUL scheduled`);
        if (!creepController.hasTaskScheduled("TASK_HARVEST")) {
            creepController.scheduleTask(new Harvest());
        }
        if (!creepController.hasTaskScheduled("TASK_HAUL")) {
            creepController.scheduleTask(new Haul());
        }
    }
}
