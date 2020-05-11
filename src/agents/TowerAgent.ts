import { BaseAgent } from "agents/BaseAgent";
import { TowerController } from "agents/controllers/TowerController";
import { TowerTask } from "tasks/TowerTask";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("controllers.agents.TowerAgent", COLORS.controllers);

export class TowerAgent extends BaseAgent<StructureTower, TowerController, TowerTask, TowerMemory> {
    public towerController?: TowerController;
    public newSpawnRequests: SpawnRequest[] = [];
    public roomName: string

    constructor(roomName: string, id: string) {
        super(id, Memory.rooms[roomName].towers, logger);
        this.roomName = roomName;
    }

    protected reloadControllers() {
        const tower = Game.getObjectById(this.name) as StructureTower;
        if (tower) {
            this.towerController = new TowerController(tower);
        }
    }

    public getController() {
        return this.towerController;
    }

    public toString() {
        return `agent for ${this.towerController}`;
    }

    protected createTaskInstance(taskMemory: TowerTaskMemory): TowerTask {
        return new TowerTask(taskMemory);
    }

    protected commitToMemory(memory: TowerMemory) {
        Memory.rooms[this.roomName].towers = Memory.rooms[this.roomName].towers || {};
        Memory.rooms[this.roomName].towers[this.name] = memory;
    }
}
