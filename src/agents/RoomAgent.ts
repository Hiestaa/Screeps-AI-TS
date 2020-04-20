import { BaseAgent } from "agents/BaseAgent";
import { PlaceConstructionSites } from "tasks/PlaceConstructionSites";
import { COLORS, getLogger } from "utils/Logger";
import { RoomController } from "./controllers/RoomController";

const logger = getLogger("controllers.agents.RoomAgent", COLORS.controllers);

export class RoomAgent extends BaseAgent<Room, RoomController, PlaceConstructionSites, RoomMemory> {
    public roomController?: RoomController;
    public memory: RoomMemory = {
        tasks: [],
        idleTime: 0,
    };

    constructor(name: string) {
        super(name, Memory.rooms, logger);
    }

    protected reloadControllers() {
        const room = Game.rooms[this.name];
        if (room) {
            this.roomController = new RoomController(room);
        }
    }

    public getController() {
        return this.roomController;
    }

    public toString() {
        return `agents for ${this.roomController}`;
    }

    protected createTaskInstance(taskMemory: PlaceConstructionSitesMemory): PlaceConstructionSites {
        return new PlaceConstructionSites(
            taskMemory.anchor,
            taskMemory.scheduledBuildUnits,
            taskMemory.buildUnitsInProgress,
        );
    }

    protected commitToMemory(memory: RoomMemory) {
        Memory.rooms[this.name] = memory;
    }
}
