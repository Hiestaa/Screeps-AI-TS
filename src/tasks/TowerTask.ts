import { TowerController } from "agents/controllers/TowerController";
import { makeCreepProfileInstance } from "colony/creepProfiles";
import { BaseTask } from "tasks/BaseTask";
import { gun } from "utils/id";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("tasks.TowerTask", COLORS.tasks);

const DEFENSE_RADIUS = 10;

export class TowerTask extends BaseTask<StructureTower, TowerController> {
    constructor(memory?: TowerTaskMemory) {
        super();
    }

    public execute(spawnCtl: TowerController) {
        // TODO: attack, heal or repair any creep/structure in covered radius
    }


    public completed() {
        return false;
    }

    public toJSON(): TaskMemory {
        return {
            type: "TASK_TOWER",
            executionStarted: this.executionStarted,
            executionPaused: this.executionPaused,
        };
    }

    public getType(): "TASK_TOWER" {
        return "TASK_TOWER";
    }
}
