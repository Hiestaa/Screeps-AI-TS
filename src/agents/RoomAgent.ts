import { BaseAgent } from "agents/BaseAgent";
import { PlaceConstructionSites } from "tasks/PlaceConstructionSites";
import { COLORS, getLogger } from "utils/Logger";
import { RoomController } from "./controllers/RoomController";

const logger = getLogger("controllers.agents.RoomAgent", COLORS.controllers);

export class RoomAgent extends BaseAgent<Room, RoomController, PlaceConstructionSites, RoomMemory> {
    public roomController?: RoomController;

    constructor(name: string) {
        super(name, Memory.rooms, logger);
    }

    protected reloadControllers() {
        const room = Game.rooms[this.name];
        if (room) {
            this.roomController = new RoomController(room);
        }
    }

    public execute() {
        super.execute();
        const roomName = this.roomController?.room.name;
        if (!roomName) {
            return;
        }
        for (const task of this.taskQueue) {
            if (task.getType() === "TASK_PLACE_CONSTRUCTION_SITES") {
                task.visualize(roomName);
            }
        }
    }

    /**
     * Indicates whether the controller level changed at the beginning of this turn.
     * @return the new controller level, or undefined if it hasn't changed.
     */
    public hasControllerLevelChanged(): number | undefined {
        const controllerLevel = this.roomController?.room.controller?.level || 0;
        const prevLevel = this.memory.controllerLevel || 0;
        if (prevLevel !== controllerLevel) {
            return controllerLevel;
        }
        return undefined;
    }

    public getController() {
        return this.roomController;
    }

    public toString() {
        return `agents for ${this.roomController}`;
    }

    protected createTaskInstance(taskMemory: PlaceConstructionSitesMemory): PlaceConstructionSites {
        return new PlaceConstructionSites(taskMemory.scheduledBuildUnits, taskMemory.buildUnitsInProgress);
    }

    protected commitToMemory(memory: RoomMemory) {
        const controllerLevel = this.roomController?.room.controller?.level;
        memory.controllerLevel = controllerLevel || 0;
        Memory.rooms[this.name] = memory;
    }
}
