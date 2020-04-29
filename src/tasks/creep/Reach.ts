import { CreepController } from "agents/controllers/CreepController";
import { BaseCreepTask } from "tasks/creep/BaseCreepTask";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("tasks.creep.Reach", COLORS.tasks);

/**
 * Simply reach the destination point.
 * Stops if path get blocked.
 * TODO: make it insist a little longer than 1 turn
 */
export class Reach extends BaseCreepTask {
    public destination: { x: number; y: number };
    private noPath: boolean = false;

    constructor(destination: { x: number; y: number }) {
        super("TASK_REACH");
        this.destination = destination;
    }

    public canBeExecuted(creepCtl: CreepController) {
        return true;
    }

    public execute(creepCtl: CreepController) {
        return creepCtl
            .moveTo(this.destination.x, this.destination.y)
            .on(ERR_NO_PATH, () => {
                this.noPath = true;
            })
            .logFailure();
    }

    public toJSON(): ReachTaskMemory {
        const json = super.toJSON();
        const memory: ReachTaskMemory = { destination: this.destination, ...json };
        return memory;
    }

    public completed(creepCtl: CreepController) {
        return this.noPath;
    }

    public description() {
        return "🚗";
    }
}
