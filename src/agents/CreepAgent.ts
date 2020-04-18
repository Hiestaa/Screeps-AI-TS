import { CreepController } from "agents/controllers/CreepController";
import { BaseCreepTask } from "tasks/creep/BaseCreepTask";
import { Build } from "tasks/creep/Build";
import { Harvest } from "tasks/creep/Harvest";
import { Haul } from "tasks/creep/Haul";
import { COLORS, getLogger } from "utils/Logger";
import { BaseAgent } from "./BaseAgent";

const logger = getLogger("controllers.agents.CreepAgent", COLORS.controllers);

export class CreepAgent extends BaseAgent<Creep, CreepController, BaseCreepTask> {
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
        } else {
            throw new Error("Unable to find creep object in Game.creeps");
        }
    }

    public getController() {
        return this.creepController;
    }

    public toString() {
        return `agent for ${this.creepController}`;
    }

    protected createTaskInstance(taskMemory: CreepTaskMemory): BaseCreepTask {
        switch (taskMemory.type) {
            case "TASK_HAUL":
                return new Haul((taskMemory as HaulTaskMemory).deliveryTargets);
            case "TASK_HARVEST":
                return new Harvest();
            case "TASK_BUILD":
                return new Build((taskMemory as BuildTaskMemory).buildPriority);
        }
    }

    protected onTaskExecutionStarts(task: BaseCreepTask, creepCtl: CreepController | undefined) {
        super.onTaskExecutionStarts(task, creepCtl);
        if (creepCtl) {
            creepCtl.creep.say(task.description());
        }
    }
}
