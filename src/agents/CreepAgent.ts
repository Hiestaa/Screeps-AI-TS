import { CreepController } from "agents/controllers/CreepController";
import { Attack, RangedAttack } from "tasks/creep/Attack";
import { BaseCreepTask } from "tasks/creep/BaseCreepTask";
import { Build } from "tasks/creep/Build";
import { Fetch } from "tasks/creep/Fetch";
import { Harvest, HarvestNonStop } from "tasks/creep/Harvest";
import { Haul } from "tasks/creep/Haul";
import { Heal } from "tasks/creep/Heal";
import { Reach } from "tasks/creep/Reach";
import { Repair } from "tasks/creep/Repair";
import { UpgradeController } from "tasks/creep/UpgradeController";
import { COLORS, getLogger } from "utils/Logger";
import { BaseAgent } from "./BaseAgent";

const logger = getLogger("controllers.agents.CreepAgent", COLORS.controllers);

export function createTaskInstance(taskMemory: CreepTaskMemory): BaseCreepTask {
    switch (taskMemory.type) {
        case "TASK_HAUL":
            return new Haul(taskMemory as HaulTaskMemory);
        case "TASK_HARVEST":
            return new Harvest(taskMemory as HarvestTaskMemory);
        case "TASK_HARVEST_NON_STOP":
            return new HarvestNonStop(taskMemory as HarvestTaskMemory);
        case "TASK_BUILD":
            return new Build(taskMemory as BuildTaskMemory);
        case "TASK_FETCH":
            return new Fetch(taskMemory as FetchTaskMemory);
        case "TASK_REPAIR":
            return new Repair(taskMemory as RepairTaskMemory);
        case "TASK_UPGRADE_CONTROLLER":
            return new UpgradeController();
        case "TASK_HEAL":
            return new Heal(taskMemory as HealTaskMemory);
        case "TASK_ATTACK":
            return new Attack(taskMemory as AttackTaskMemory);
        case "TASK_RANGED_ATTACK":
            return new RangedAttack(taskMemory as AttackTaskMemory);
        case "TASK_REACH":
            return new Reach(taskMemory as ReachTaskMemory);
    }
}


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
        return createTaskInstance(taskMemory);
    }

    protected onTaskExecutionStarts(task: BaseCreepTask, creepCtl: CreepController | undefined) {
        this.logger.debug(`${creepCtl}: Started execution of task: ${task}`);
        if (creepCtl) {
            creepCtl.creep.say(task.description());
        }
    }

    protected logTaskExecutionCompletion(task: BaseCreepTask, creepCtl: CreepController | undefined) {
        this.logger.debug(`${creepCtl}: Completed execution of task: ${task}`);
    }

    protected commitToMemory(memory: CreepMemory) {
        Memory.creeps[this.name] = memory;
    }
}
