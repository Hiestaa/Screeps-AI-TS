import { CreepController } from "agents/controllers/CreepController";
import { BaseTask } from "tasks/BaseTask";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("tasks.BaseCreepTask", COLORS.tasks);

/**
 * Simple harvest task - go harvest from the first source available.
 * @param creepController controller for the creep that will perform this task
 */
export abstract class BaseCreepTask extends BaseTask<Creep, CreepController> {
    public type: CREEP_TASK;

    constructor(type: CREEP_TASK) {
        super();
        this.type = type;
    }

    public abstract execute(creep: CreepController): void;

    public abstract completed(creep: CreepController): boolean;

    public toJSON(): CreepTaskMemory {
        return {
            type: this.type,
            executionStarted: this.executionStarted,
            executionPaused: this.executionPaused,
        };
    }

    public getType() {
        return this.type;
    }

    public description(): string {
        return this.type;
    }
}
