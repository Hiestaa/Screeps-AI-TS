import { BaseAgent } from "agents/BaseAgent";
import { PlaceConstructionSites } from "tasks/PlaceConstructionSites";
import { COLORS, getLogger } from "utils/Logger";
import { RoomController } from "./controllers/RoomController";

const logger = getLogger("controllers.agents.RoomAgent", COLORS.controllers);

export class RoomAgent extends BaseAgent<Room, RoomController, PlaceConstructionSites> {
    public roomController?: RoomController;
    public memoryLocation: "rooms" = "rooms";
    public memory: SpawnMemory = {
        tasks: [],
        idleTime: 0,
    };

    constructor(name: string) {
        super(name, logger);
    }

    protected reloadControllers() {
        const spawn = Game.rooms[this.name];
        if (spawn) {
            this.roomController = new RoomController(spawn);
        }
    }

    public getController() {
        return this.roomController;
    }

    public toString() {
        return `agents for ${this.roomController}`;
    }

    protected createTaskInstance(taskMemory: PlaceConstructionSitesMemory): PlaceConstructionSites {
        return new PlaceConstructionSites(taskMemory.anchor, taskMemory.scheduledBuildUnits);
    }
}
