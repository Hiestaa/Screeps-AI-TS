import { CreepController } from "controllers/CreepController";
import { SpawnController } from "controllers/SpawnController";

export interface IControllerStore {
    creeps: { [key: string]: CreepController };
    spawns: { [key: string]: SpawnController };
}

export function initControllerStore(): IControllerStore {
    return {
        creeps: {},
        spawns: {},
    };
}

export type CONTROLLER_STORE_LOCATIONS = "creeps" | "spawns";
