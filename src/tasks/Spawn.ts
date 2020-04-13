import { BaseTask } from "tasks/ITask";
import { gun } from "utils/id";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("tasks.Spawn", COLORS.tasks);

/**
 */
export class SpawnTask extends BaseTask<StructureSpawn> {
    public target: number;

    constructor(target: number) {
        super();
        this.target = target;
    }

    public execute(spawn: StructureSpawn) {
        const name = gun("H:CMW");
        const res = spawn.spawnCreep([CARRY, MOVE, WORK], name);
        if (res === ERR_NOT_ENOUGH_ENERGY) {
            logger.debug("Not enough energy to produce harvester");
        } else if (res !== OK && res !== ERR_BUSY) {
            logger.failure(res, "Unable to spawn creep");
        }
    }

    public completed() {
        return Object.keys(Game.creeps).length > this.target;
    }

    public toJSON(): TaskMemory {
        return {
            target: this.target,
            type: "TASK_SPAWN",
            executionStarted: this.executionStarted,
        };
    }

    public getType(): "TASK_SPAWN" {
        return "TASK_SPAWN";
    }
}
