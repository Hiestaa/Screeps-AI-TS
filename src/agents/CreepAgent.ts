import { CreepController } from "agents/controllers/CreepController";
import { BaseCreepTask } from "tasks/creep/BaseCreepTask";
import { Build } from "tasks/creep/Build";
import { Fetch } from "tasks/creep/Fetch";
import { Harvest, HarvestNonStop } from "tasks/creep/Harvest";
import { Haul } from "tasks/creep/Haul";
import { COLORS, getLogger } from "utils/Logger";
import { BaseAgent } from "./BaseAgent";

const logger = getLogger("controllers.agents.CreepAgent", COLORS.controllers);

export class CreepAgent extends BaseAgent<Creep, CreepController, BaseCreepTask, CreepMemory> {
    public creepController?: CreepController;

    constructor(name: string) {
        super(name, Memory.creeps, logger);
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
                return new Harvest((taskMemory as HarvestTaskMemory).sourceId);
            case "TASK_HARVEST_NON_STOP":
                return new HarvestNonStop((taskMemory as HarvestTaskMemory).sourceId);
            case "TASK_BUILD":
                return new Build((taskMemory as BuildTaskMemory).buildPriority);
            case "TASK_FETCH":
                return new Fetch();
        }
    }

    protected onTaskExecutionStarts(task: BaseCreepTask, creepCtl: CreepController | undefined) {
        super.onTaskExecutionStarts(task, creepCtl);
        if (creepCtl) {
            creepCtl.creep.say(task.description());
        }
    }

    protected commitToMemory(memory: CreepMemory) {
        Memory.creeps[this.name] = memory;
    }
}
