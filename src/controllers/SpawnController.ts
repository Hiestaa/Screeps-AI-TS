import { SpawnTask } from "tasks/Spawn";
import { SpawnTaskExecutor } from "tasks/TaskExecutor";
import { COLORS, getLogger } from "utils/Logger";
import { BaseTaskExecutorController } from "./BaseTaskExecutorController";

const logger = getLogger("controllers.CreepController", COLORS.controllers);
/**
 * Base class to control a spawn unit
 */
export class SpawnController extends BaseTaskExecutorController<StructureSpawn, SpawnTask, SpawnTaskExecutor> {
    public spawn?: StructureSpawn;
    public memoryLocation: "spawns" = "spawns";
    public memory: SpawnMemory = {
        tasks: [],
    };

    constructor(name: string) {
        super(name, SpawnTaskExecutor, logger);
    }

    public reloadGameObjects() {
        const spawn = Game.spawns[this.name];
        if (spawn) {
            this.spawn = spawn;
        }
    }

    public getRoomObject() {
        return this.spawn;
    }

    public toString() {
        return `controller for ${this.spawn}`;
    }
}
