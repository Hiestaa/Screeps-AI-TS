import { SpawnController } from "controllers/SpawnController";
import { BaseTask } from "tasks/ITask";
import { gun } from "utils/id";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("tasks.Spawn", COLORS.tasks);

/**
 */
export class SpawnTask extends BaseTask<StructureSpawn, SpawnController> {
    public creepCountTarget: number;

    constructor(creepCountTarget: number) {
        super();
        this.creepCountTarget = creepCountTarget;
    }

    public execute(spawnCtl: SpawnController) {
        const name = gun("H:CMW");
        const creepCount = Object.keys(Game.creeps).length;
        if (creepCount > this.creepCountTarget) {
            logger.debug(`Not spawning any creep - reached desired count ${creepCount}/${this.creepCountTarget}`);
            return;
        }

        spawnCtl
            .spawnCreep(this.maxCreepProfile(spawnCtl), name)
            .on(ERR_NOT_ENOUGH_ENERGY, () => logger.debug("Not enough energy to produce creep"))
            .logFailure();
    }

    // TODO: maybe hardcode a few levels instead to make it more predictable?
    private maxCreepProfile(spawnCtl: SpawnController) {
        const energy = spawnCtl.availableEnergy();
        let parts = [CARRY, WORK, MOVE];
        const newParts = parts.slice();
        let level = 3;
        while (this.computeBuildCost(newParts) <= energy) {
            level += 1;
            parts = newParts.slice(); // copy
            newParts.push(this.nextBodyPart(level));
        }
        logger.debug(`Energy available: ${energy}. Estimated cost: ${this.computeBuildCost(parts)}.`);
        if (this.computeBuildCost(parts) <= energy) {
            logger.info(`Spawning creep level ${level} with body parts: ${parts.join(",")}`);
        }
        return parts;
    }

    private computeBuildCost(parts: BodyPartConstant[]) {
        return parts.reduce((acc, p) => acc + BODYPART_COST[p], 0);
    }

    private nextBodyPart(level: number) {
        if ([0, 3, 6, 8].includes(level % 10)) {
            return CARRY;
        } else if ([1, 4, 7, 9].includes(level % 10)) {
            return WORK;
        } else {
            return MOVE;
        }
    }

    public completed() {
        return false;
    }

    public toJSON(): TaskMemory {
        return {
            creepCountTarget: this.creepCountTarget,
            type: "TASK_SPAWN",
            executionStarted: this.executionStarted,
        };
    }

    public getType(): "TASK_SPAWN" {
        return "TASK_SPAWN";
    }
}
