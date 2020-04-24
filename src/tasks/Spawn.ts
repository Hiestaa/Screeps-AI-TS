import { SpawnController } from "agents/controllers/SpawnController";
import { makeCreepProfileInstance } from "colony/creepProfiles";
import { BaseTask } from "tasks/BaseTask";
import { gun } from "utils/id";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("tasks.Spawn", COLORS.tasks);

/**
 * TODO: take battalion id as parameter for spawn task and assign the battalion in creep memory when spawning it
 */
export class SpawnTask extends BaseTask<StructureSpawn, SpawnController> {
    public requests: SpawnRequest[];
    public executionPeriod = 10;

    constructor(requests: SpawnRequest[]) {
        super();
        this.requests = requests;
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
        spawnCtl
            .spawnCreep(this.maxCreepProfile(energyStructures, currentRequest.creepProfile), name, {
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
    ): BodyPartConstant[] {
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
        if (maxedPotentialCost <= energy) {
            logger.info(`Spawning '${profileWithMaxPotentialEnergy}' ${suffix}.`);
        } else if (initialCost >= energy) {
            logger.info(`Unable to spawn '${profileWithMaxPotentialEnergy}' ${suffix}.`);
        } else {
            // TODO: count the number of cycles where we're delaying and stop delaying when this exceeds a threshold
            // in which case spawn `profileWithCurrentEnergy`
            logger.info(
                `Delaying spawn of '${profileWithMaxPotentialEnergy}' until ${maxedPotentialCost} ` +
                    `energy is available ${suffix}.`,
            );
        }
        return profileWithMaxPotentialEnergy.bodyParts;
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
            type: "TASK_SPAWN",
            executionStarted: this.executionStarted,
        };
    }

    public getType(): "TASK_SPAWN" {
        return "TASK_SPAWN";
    }
}
