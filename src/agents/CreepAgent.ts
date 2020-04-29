import { CreepController } from "agents/controllers/CreepController";
import { Attack, RangedAttack } from "tasks/creep/Attack";
import { BaseCreepTask } from "tasks/creep/BaseCreepTask";
import { Build } from "tasks/creep/Build";
import { Fetch } from "tasks/creep/Fetch";
import { Harvest, HarvestNonStop } from "tasks/creep/Harvest";
import { Haul } from "tasks/creep/Haul";
import { Heal } from "tasks/creep/Heal";
import { Repair } from "tasks/creep/Repair";
import { UpgradeController } from "tasks/creep/UpgradeController";
import { COLORS, getLogger } from "utils/Logger";
import { BaseAgent } from "./BaseAgent";

const logger = getLogger("controllers.agents.CreepAgent", COLORS.controllers);

export class CreepAgent extends BaseAgent<Creep, CreepController, BaseCreepTask, CreepMemory> {
    public creepController?: CreepController;
    public profile: CREEP_PROFILE;

    constructor(name: string) {
        super(name, Memory.creeps, logger);
        this.profile = this.memory.profile;
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
                const mem = taskMemory as HaulTaskMemory;
                return new Haul(mem.deliveryTargets, mem.excludedPositions);
            case "TASK_HARVEST":
                return new Harvest((taskMemory as HarvestTaskMemory).sourceId);
            case "TASK_HARVEST_NON_STOP":
                return new HarvestNonStop((taskMemory as HarvestTaskMemory).sourceId);
            case "TASK_BUILD":
                return new Build((taskMemory as BuildTaskMemory).buildPriority);
            case "TASK_FETCH":
                return new Fetch((taskMemory as FetchTaskMemory).excludedPositions);
            case "TASK_REPAIR":
                return new Repair();
            case "TASK_UPGRADE_CONTROLLER":
                return new UpgradeController();
            case "TASK_HEAL":
                return new Heal((taskMemory as HealTaskMemory).currentTarget);
            case "TASK_ATTACK":
                return new Attack((taskMemory as AttackTaskMemory).target);
            case "TASK_RANGED_ATTACK":
                return new RangedAttack((taskMemory as AttackTaskMemory).target);
        }
    }

    protected onTaskExecutionStarts(task: BaseCreepTask, creepCtl: CreepController | undefined) {
        this.logger.debug(`${creepCtl}: Started execution of task: ${task}`);
        if (creepCtl) {
            creepCtl.creep.say(task.description());
        }
    }

    protected onTaskExecutionCompletes(task: BaseCreepTask, creepCtl: CreepController | undefined) {
        this.logger.debug(`${creepCtl}: Completed execution of task: ${task}`);
        return;
    }

    protected commitToMemory(memory: CreepMemory) {
        Memory.creeps[this.name] = memory;
    }
}
