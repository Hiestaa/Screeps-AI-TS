import { BaseAgent } from "agents/BaseAgent";
import { SpawnController } from "agents/controllers/SpawnController";
import { SpawnTask } from "tasks/Spawn";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("controllers.agents.SpawnAgent", COLORS.controllers);

export class SpawnAgent extends BaseAgent<StructureSpawn, SpawnController, SpawnTask, SpawnMemory> {
    public spawnController?: SpawnController;
    public newSpawnRequests: SpawnRequest[] = [];

    constructor(name: string) {
        super(name, Memory.spawns, logger);
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
        return `agent for ${this.spawnController}`;
    }

    protected createTaskInstance(taskMemory: SpawnTaskMemory): SpawnTask {
        return new SpawnTask(taskMemory.requests);
    }

    public requestSpawn(battalion: string, count: number, profile: CREEP_PROFILE) {
        this.newSpawnRequests.push({ battalion, count, creepProfile: profile });
    }

    public execute() {
        if (this.newSpawnRequests.length > 0) {
            this.scheduleTask(new SpawnTask(this.newSpawnRequests.slice()));
        }
        super.execute();
    }

    protected commitToMemory(memory: SpawnMemory) {
        Memory.spawns[this.name] = memory;
    }

    public pendingSpawnRequests(battalion: string) {
        const requests = this.newSpawnRequests.filter(({ battalion: battalionId }) => battalionId === battalion);
        for (const task of this.taskQueue) {
            for (const request of task.requests) {
                if (request.battalion === battalion) {
                    requests.push(request);
                }
            }
        }
        return requests;
    }
}
