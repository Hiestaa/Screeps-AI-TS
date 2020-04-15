import { CreepController } from "controllers/CreepController";
import { BaseCreepTask } from "tasks/creep/BaseCreepTask";
import { Harvest } from "tasks/creep/Harvest";
import { Haul } from "tasks/creep/Haul";
import { COLORS, getLogger } from "utils/Logger";
import { BaseTaskExecutor } from "./BaseTaskExecutor";

const logger = getLogger("controllers.taskExecutors.CreepTaskExecutor", COLORS.controllers);

export class CreepTaskExecutor extends BaseTaskExecutor<Creep, CreepController, BaseCreepTask> {
    public creepController?: CreepController;
    public memoryLocation: "creeps" = "creeps";
    public memory: CreepMemory = {
        tasks: [],
    };

    constructor(name: string) {
        super(name, logger);
    }

    protected reloadControllers() {
        const creep = Game.creeps[this.name];
        if (creep) {
            this.creepController = new CreepController(creep);
        }
    }

    protected getController() {
        return this.creepController;
    }

    public toString() {
        return `task executor for ${this.creepController}`;
    }

    protected createTaskInstance(taskMemory: CreepTaskMemory): BaseCreepTask {
        switch (taskMemory.type) {
            case "TASK_HAUL":
                return new Haul();
            case "TASK_HARVEST":
                return new Harvest();
        }
    }

    protected onTaskExecutionStarts(task: BaseCreepTask, creepCtl: CreepController) {
        super.onTaskExecutionStarts(task, creepCtl);
        creepCtl.creep.say(task.description());
    }
}
