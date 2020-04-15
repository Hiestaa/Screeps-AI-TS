import { SpawnController } from "controllers/SpawnController";
import { BaseTaskExecutor } from "controllers/taskExecutors/BaseTaskExecutor";
import { SpawnTask } from "tasks/Spawn";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("controllers.taskExecutors.SpawnTaskExecutor", COLORS.controllers);

export class SpawnTaskExecutor extends BaseTaskExecutor<StructureSpawn, SpawnController, SpawnTask> {
    public spawnController?: SpawnController;
    public memoryLocation: "spawns" = "spawns";
    public memory: SpawnMemory = {
        tasks: [],
    };

    constructor(name: string) {
        super(name, logger);
    }

    protected reloadControllers() {
        const spawn = Game.spawns[this.name];
        if (spawn) {
            this.spawnController = new SpawnController(spawn);
        }
    }

    protected getController() {
        return this.spawnController;
    }

    public toString() {
        return `task executor for ${this.spawnController}`;
    }

    protected createTaskInstance(taskMemory: SpawnTaskMemory): SpawnTask {
        return new SpawnTask(taskMemory.creepCountTarget);
    }
}
