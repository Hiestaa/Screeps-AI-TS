import { CreepTaskExecutor } from "controllers/taskExecutors/CreepTaskExecutor";
import { SpawnTaskExecutor } from "controllers/taskExecutors/SpawnTaskExecutor";

export interface IControllerStore {
    creeps: { [key: string]: CreepTaskExecutor };
    spawns: { [key: string]: SpawnTaskExecutor };
}

export function initControllerStore(): IControllerStore {
    return {
        creeps: {},
        spawns: {},
    };
}

export type CONTROLLER_STORE_LOCATIONS = "creeps" | "spawns";
