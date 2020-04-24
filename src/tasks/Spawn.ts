import { SpawnController } from "agents/controllers/SpawnController";
import { makeCreepProfileInstance } from "colony/creepProfiles";
import { BaseTask } from "tasks/BaseTask";
import { gun } from "utils/id";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("tasks.Spawn", COLORS.tasks);

const MAX_SPAWN_DELAY = 100;

/**
 * TODO: take battalion id as parameter for spawn task and assign the battalion in creep memory when spawning it
 */
export class SpawnTask extends BaseTask<StructureSpawn, SpawnController> {
    public requests: SpawnRequest[];
    public executionPeriod = 10;
    private spawnDelay = 0;

    constructor(requests: SpawnRequest[], spawnDelay: number = 0) {
        super();
        this.requests = requests;
        this.spawnDelay = spawnDelay;
    }

    public execute(spawnCtl: SpawnController) {
        if (this.requests.length === 0) {
            return;
        }
        const currentRequest = this.requests[0];
        if (currentRequest.count === 0) {
            logger.debug(`Not spawning any creep - all requested creeps have been spawned.`);
            return;
        }

        const name = gun((currentRequest.creepProfile || "Harvest").slice(0, 4));
        const energyStructures = this.getEnergyStructures(spawnCtl);
        const bodyParts = this.maxCreepProfile(energyStructures, currentRequest.creepProfile);
        if (!bodyParts) {
            return;
        }
        spawnCtl
            .spawnCreep(bodyParts, name, {
                energyStructures,
                memory: {
                    battalion: currentRequest.battalion,
                    tasks: [],
                    idleTime: 0,
                    profile: currentRequest.creepProfile,
                },
            })
            .on(OK, () => {
                currentRequest.count -= 1;
                if (currentRequest.count === 0) {
                    this.requests.shift();
                }
            })
            .on(ERR_NOT_ENOUGH_ENERGY, () => logger.warning("Not enough energy to produce creep"))
            .logFailure();
    }

    // TODO: maybe hard-code a few levels instead to make it more predictable?
    private maxCreepProfile(
        energyStructures: Array<StructureSpawn | StructureExtension>,
        creepProfile: CREEP_PROFILE,
    ): BodyPartConstant[] | undefined {
        const energy = this.computeAvailableEnergy(energyStructures);
        const potentialEnergy = this.computePotentialEnergy(energyStructures);
        const profile = makeCreepProfileInstance(creepProfile);
        const initialCost = profile.cost();

        let profileWithCurrentEnergy = profile.clone();
        while (profile.cost() <= energy) {
            profileWithCurrentEnergy = profile.clone();
            profile.incrementLevel();
        }

        let profileWithMaxPotentialEnergy = profileWithCurrentEnergy;
        while (profile.cost() <= potentialEnergy) {
            profileWithMaxPotentialEnergy = profile.clone();
            profile.incrementLevel();
        }
        const maxedPotentialCost = profileWithMaxPotentialEnergy.cost();

        const suffix = `(potential for: ${potentialEnergy}, cost min: ${initialCost}, available: ${energy})`;
        const maxSpawnDelay = MAX_SPAWN_DELAY / this.executionPeriod;
        if (maxedPotentialCost <= energy) {
            logger.info(`Spawning '${profileWithMaxPotentialEnergy}' ${suffix}.`);
            this.spawnDelay = 0;
            return profileWithMaxPotentialEnergy.bodyParts;
        } else if (initialCost >= energy) {
            logger.info(`Unable to spawn '${profileWithMaxPotentialEnergy}' ${suffix}.`);
            return;
        } else if (this.spawnDelay > maxSpawnDelay) {
            logger.info(`Spawning ${profileWithCurrentEnergy} after delay of ${this.spawnDelay} cycle ${suffix}.`);
            this.spawnDelay = 0;
            return profileWithCurrentEnergy.bodyParts;
        } else {
            // TODO: count the number of cycles where we're delaying and stop delaying when this exceeds a threshold
            // in which case spawn `profileWithCurrentEnergy`
            logger.info(
                `Spawn delay ${this.spawnDelay}/${maxSpawnDelay} of '${profileWithMaxPotentialEnergy}' ` +
                    `until ${maxedPotentialCost} energy is available ${suffix}.`,
            );
            this.spawnDelay += 1;
            return;
        }
    }

    private computeAvailableEnergy(energyStructures: Array<StructureSpawn | StructureExtension>) {
        return energyStructures.reduce((acc, structure) => acc + structure.store[RESOURCE_ENERGY], 0);
    }

    public computePotentialEnergy(energyStructures: Array<StructureSpawn | StructureExtension>) {
        return energyStructures.reduce(
            (acc, structure) =>
                acc +
                structure.store.getUsedCapacity(RESOURCE_ENERGY) +
                structure.store.getFreeCapacity(RESOURCE_ENERGY),
            0,
        );
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
        return this.requests.length === 0;
    }

    public toJSON(): TaskMemory {
        return {
            requests: this.requests,
            spawnDelay: this.spawnDelay,
            type: "TASK_SPAWN",
            executionStarted: this.executionStarted,
            executionPaused: this.executionPaused,
        };
    }

    public getType(): "TASK_SPAWN" {
        return "TASK_SPAWN";
    }
}
