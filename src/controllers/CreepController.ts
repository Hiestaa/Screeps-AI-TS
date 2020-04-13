import { BaseCreepTask } from "tasks/creep/BaseCreepTask";
import { CreepTaskExecutor } from "tasks/TaskExecutor";
import { COLORS, getLogger } from "utils/Logger";
import { BaseTaskExecutorController } from "./BaseTaskExecutorController";

const logger = getLogger("controllers.CreepController", COLORS.controllers);

/**
 * Base class to control a creep unit
 */
export class CreepController extends BaseTaskExecutorController<Creep, BaseCreepTask, CreepTaskExecutor> {
    public creep?: Creep;
    public memoryLocation: "creeps" = "creeps";
    public memory: CreepMemory = {
        tasks: [],
    };

    constructor(name: string) {
        super(name, CreepTaskExecutor, logger);
    }

    public reloadGameObjects() {
        const creep = Game.creeps[this.name];
        if (creep) {
            this.creep = creep;
        }
    }

    public getRoomObject() {
        return this.creep;
    }

    public toString() {
        return `controller for ${this.creep}`;
    }
}
