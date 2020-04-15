import { CreepTaskExecutor } from "controllers/taskExecutors/CreepTaskExecutor";
import { SpawnTaskExecutor } from "controllers/taskExecutors/SpawnTaskExecutor";

export interface ITaskExecutorStore {
    creeps: { [key: string]: CreepTaskExecutor };
    spawns: { [key: string]: SpawnTaskExecutor };
}

export function initTaskExecutorStore(): ITaskExecutorStore {
    return {
        creeps: {},
        spawns: {},
    };
}

export type CONTROLLER_STORE_LOCATIONS = "creeps" | "spawns";
