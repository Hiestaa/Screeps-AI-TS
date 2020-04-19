import { SpawnController } from "agents/controllers/SpawnController";
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
        if (creepCount >= this.creepCountTarget) {
            logger.debug(`Not spawning any creep - reached desired count ${creepCount}/${this.creepCountTarget}`);
            return;
        }

        const energyStructures = this.getEnergyStructures(spawnCtl);
        spawnCtl
            .spawnCreep(this.maxCreepProfile(spawnCtl, energyStructures), name, { energyStructures })
            .on(ERR_NOT_ENOUGH_ENERGY, () => logger.warning("Not enough energy to produce creep"))
            .logFailure();
    }

    // TODO: maybe hard-code a few levels instead to make it more predictable?
    private maxCreepProfile(spawnCtl: SpawnController, energyStructures: Array<StructureSpawn | StructureExtension>) {
        const energy = this.computeAvailableEnergy(energyStructures);
        let parts = [CARRY, WORK, MOVE];
        const newParts = parts.slice();
        let level = 3;
        while (this.computeBuildCost(newParts) <= energy) {
            level += 1;
            parts = newParts.slice(); // copy
            newParts.push(this.nextBodyPart(level));
        }
        logger.info(`Energy available: ${energy}. Estimated cost: ${this.computeBuildCost(parts)}.`);
        if (this.computeBuildCost(parts) <= energy) {
            logger.info(`Spawning creep level ${level} with body parts: ${parts.join(",")}`);
        }
        return parts;
    }

    private computeAvailableEnergy(energyStructures: Array<StructureSpawn | StructureExtension>) {
        return energyStructures.reduce((acc, structure) => acc + structure.store[RESOURCE_ENERGY], 0);
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

    private getEnergyStructures(spawnCtl: SpawnController): Array<StructureExtension | StructureSpawn> {
        const extensions = spawnCtl.spawn.room.find(FIND_MY_STRUCTURES, {
            filter: structure => structure.structureType === STRUCTURE_EXTENSION && structure.isActive(),
        }) as StructureExtension[];
        const otherSpawns = spawnCtl.spawn.room.find(FIND_MY_STRUCTURES, {
            filter: structure => structure.structureType === STRUCTURE_SPAWN && structure.id !== spawnCtl.spawn.id,
        }) as StructureSpawn[];
        return ([spawnCtl.spawn] as Array<StructureExtension | StructureSpawn>).concat(extensions).concat(otherSpawns);
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
