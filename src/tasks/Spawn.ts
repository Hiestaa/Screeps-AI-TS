import { SpawnController } from "agents/controllers/SpawnController";
import { makeCreepProfileInstance } from "colony/creepProfiles";
import { BaseTask } from "tasks/BaseTask";
import { gun } from "utils/id";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("tasks.Spawn", COLORS.tasks);

const MAX_SPAWN_DELAY = 100;
const ENERGY_STORAGE_RESERVE_TARGET: { [key: number]: number } = {
    0: 0,
    1: 0,
    2: 0,
    3: 1000,
    4: 10000,
    5: 20000,
    6: 50000,
    7: 100000,
    8: 200000,
};

export class SpawnTask extends BaseTask<StructureSpawn, SpawnController> {
    public request: SpawnRequest;
    public executionPeriod = 10;
    private availableEnergyStorage: number | null = null;
    private spawnDelay = 0;

    constructor({ request, spawnDelay }: { request: SpawnRequest, spawnDelay?: number }) {
        super();
        this.request = request;
        this.spawnDelay = spawnDelay || 0;
    }

    public execute(spawnCtl: SpawnController) {
        if (!this.request) {
            return;
        }
        if (this.request.count === 0) {
            logger.debug(`${spawnCtl}: Not spawning any creep - all requested creeps have been spawned.`);
            return;
        }
        if (this.spawnDelay > (MAX_SPAWN_DELAY / this.executionPeriod) * 2) {
            logger.warning(`${spawnCtl}: Discarding spawn request after delay of ${this.spawnDelay}.`);
            this.spawnDelay = 0;
            this.request.count = 0;
            return;
        }

        const name = gun(this.request.creepProfile.slice(0, 4));
        // TODO[OPTIMIZATION] cache energy structures
        const energyStructures = this.getEnergyStructures(spawnCtl);
        // TODO[TEST] make sure offsetting works so we don't max creep out
        // unless there is storage in energy (following the reserve targets)
        const bodyParts = this.maxCreepProfile(energyStructures, this.request.creepProfile, spawnCtl);
        if (!bodyParts) {
            return;
        }
        spawnCtl
            .spawnCreep(bodyParts, name, {
                energyStructures,
                memory: {
                    battalion: this.request.battalion,
                    tasks: [],
                    idleTime: 0,
                    profile: this.request.creepProfile,
                },
            })
            .on(OK, () => {
                this.request.count -= 1;
            })
            .on(ERR_NOT_ENOUGH_ENERGY, () => logger.warning("Not enough energy to produce creep"))
            .logFailure();
    }

    // TODO: maybe hard-code a few levels instead to make it more predictable?
    private maxCreepProfile(
        energyStructures: Array<StructureSpawn | StructureExtension>,
        creepProfile: CREEP_PROFILE,
        spawnCtl: SpawnController,
    ): BodyPartConstant[] | undefined {
        const energy = this.energyStorageLevelOffset(spawnCtl, this.computeAvailableEnergy(energyStructures));
        const potentialEnergy = this.energyStorageLevelOffset(spawnCtl, this.computePotentialEnergy(energyStructures));
        const profile = makeCreepProfileInstance(creepProfile);
        const initialCost = profile.cost();

        let profileWithCurrentEnergy = profile.clone();
        while (profile.cost() <= energy && !profile.exceededMaxLevel()) {
            profileWithCurrentEnergy = profile.clone();
            profile.incrementLevel();
        }

        let profileWithMaxPotentialEnergy = profileWithCurrentEnergy;
        while (profile.cost() <= potentialEnergy && !profile.exceededMaxLevel()) {
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
            logger.info(
                `Unable to spawn '${profileWithMaxPotentialEnergy}' ${suffix} (forced delay ${
                this.spawnDelay
                }/${maxSpawnDelay * 2}).`,
            );
            this.spawnDelay += 1;
            return;
        } else if (this.spawnDelay > maxSpawnDelay) {
            logger.info(`Spawning '${profileWithCurrentEnergy}' after delay of ${this.spawnDelay} cycle ${suffix}.`);
            this.spawnDelay = 0;
            return profileWithCurrentEnergy.bodyParts;
        } else {
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

    private energyStorageLevelOffset(spawnCtl: SpawnController, energy: number) {
        const rcl = spawnCtl.spawn.room.controller?.level;
        const target = ENERGY_STORAGE_RESERVE_TARGET[rcl || 0] || 0;
        if (target === 0) {  // no reserve target, no reason to offset energy storage level
            return energy;
        }

        if (this.availableEnergyStorage === null) {
            const storages = spawnCtl.spawn.room.find(FIND_STRUCTURES, {
                filter: structure =>
                    (
                        structure.structureType === STRUCTURE_CONTAINER || (
                            structure.structureType === STRUCTURE_STORAGE && structure.my)
                    ) && (
                        structure.pos.x > spawnCtl.spawn.pos.x - 5
                        && structure.pos.x < spawnCtl.spawn.pos.x + 5
                        && structure.pos.y > spawnCtl.spawn.pos.y - 5
                        && structure.pos.y < spawnCtl.spawn.pos.y + 5
                    )
            }) as Array<StructureStorage | StructureContainer>;
            this.availableEnergyStorage = storages.reduce((acc, { store }) => acc + store.getUsedCapacity(RESOURCE_ENERGY), 0);
        }

        // if available energy in storage is 20% of the target, offset the provided energy by 20%
        const discounted = Math.min(energy, energy * this.availableEnergyStorage * 100 / target);
        if (discounted !== energy) {
            logger.info(`${this}: discounting ${energy} to ${discounted} based on ${this.availableEnergyStorage} / ${target} energy available.`);
        }
        return discounted;
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
        return this.request.count === 0;
    }

    public toJSON(): TaskMemory {
        return {
            request: this.request,
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
