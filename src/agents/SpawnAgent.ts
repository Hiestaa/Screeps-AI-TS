import { BaseAgent } from "agents/BaseAgent";
import { SpawnController } from "agents/controllers/SpawnController";
import { SpawnTask } from "tasks/Spawn";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("controllers.agents.SpawnAgent", COLORS.controllers);

export class SpawnAgent extends BaseAgent<StructureSpawn, SpawnController, SpawnTask> {
    public spawnController?: SpawnController;
    public memoryLocation: "spawns" = "spawns";
    public memory: SpawnMemory = {
        tasks: [],
        idleTime: 0,
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

    public getController() {
        return this.spawnController;
    }

    public toString() {
        return `agents for ${this.spawnController}`;
    }

    protected createTaskInstance(taskMemory: SpawnTaskMemory): SpawnTask {
        return new SpawnTask(taskMemory.creepCountTarget);
    }
}
