import { BaseAgent } from "agents/BaseAgent";
import { SpawnController } from "agents/controllers/SpawnController";
import { SpawnTask } from "tasks/Spawn";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("controllers.agents.SpawnAgent", COLORS.controllers);

// Priority levels, lower will be spawned first.
// TODO: this should probably change depending on the context
// when we're low on defense during an attack, not focusing on war effort might wipe us out
const PROFILE_PRIORITIES: { [key in CREEP_PROFILE]: number } = {
    GeneralPurpose: 0,
    Harvester: 1,
    Hauler: 2,
    Worker: 3,
    Healer: 4,
    "R-Attacker": 5,
    "M-Attacker": 6,
};

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
        return new SpawnTask(taskMemory.request, taskMemory.spawnDelay);
    }

    public requestSpawn(battalion: keyof ColonyBattalionsMemory, count: number, profile: CREEP_PROFILE) {
        this.newSpawnRequests.push({ battalion, count, creepProfile: profile });
    }

    public execute() {
        for (const request of this.newSpawnRequests) {
            this.scheduleTask(new SpawnTask(request));
        }
        this.newSpawnRequests = [];

        this.reorderSpawnTasks();
        super.execute();
    }

    private reorderSpawnTasks() {
        this.taskQueue = this.taskQueue.sort(
            (a, b) => PROFILE_PRIORITIES[a.request.creepProfile] - PROFILE_PRIORITIES[b.request.creepProfile],
        );
    }

    protected commitToMemory(memory: SpawnMemory) {
        Memory.spawns[this.name] = memory;
    }

    public pendingSpawnRequests(battalion: keyof ColonyBattalionsMemory) {
        const requests = this.newSpawnRequests.filter(({ battalion: battalionId }) => battalionId === battalion);
        for (const task of this.taskQueue) {
            if (task.request.battalion === battalion) {
                requests.push(task.request);
            }
        }
        return requests;
    }
}
