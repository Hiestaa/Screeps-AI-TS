import { CreepAgent } from "agents/CreepAgent";
import { SpawnAgent } from "agents/SpawnAgent";
import { BaseObjective, IdleObjective } from "objectives/BaseObjective";
import { ContinuousHarvesting } from "objectives/ContinuousHarvesting";
import { DefendColony } from "objectives/DefendColony";
import { RefillContainers, RefillSpawnStorage } from "objectives/EnergyHauling";
import { MaintainBuildings } from "objectives/MaintainBuildings";
import { ReachRCL2 } from "objectives/ReachRCL2";
import { ReachRCL3 } from "objectives/ReachRCL3";
import { COLORS, getLogger } from "utils/Logger";
import { RoomPlanner } from "./RoomPlanner";

const logger = getLogger("colony.Battalion", COLORS.colony);

/**
 * Controls a group of agents collaborating to achieve an objective.
 */
export class Battalion {
    public creeps: CreepAgent[] = [];
    public spawn: SpawnAgent;
    public roomPlanner: RoomPlanner;
    public objective: BaseObjective;
    public memory: BattalionMemory;
    public name: keyof ColonyBattalionsMemory;

    constructor(name: keyof ColonyBattalionsMemory, spawn: SpawnAgent, roomPlanner: RoomPlanner) {
        this.spawn = spawn;
        this.roomPlanner = roomPlanner;
        this.name = name;

        const roomName = roomPlanner.room.name;
        const roomBattalionMemory = Memory.battalions[roomName] || {};
        this.memory = roomBattalionMemory[name] || {
            objective: {
                name: "IDLE",
            },
        };

        this.objective = this.reloadObjective();
    }

    private reloadObjective(): BaseObjective {
        const objectiveMemory = this.memory.objective;

        switch (objectiveMemory.name) {
            case "REACH_RCL2":
                return new ReachRCL2(this.name);
            case "REACH_RCL3":
                return new ReachRCL3(this.name);
            case "CONTINUOUS_HARVESTING":
                return new ContinuousHarvesting(
                    this.name,
                    (objectiveMemory as ContinuousHarvestingMemory).miningSpotsPerSource,
                );
            case "REFILL_CONTAINERS":
                return new RefillContainers(this.name);
            case "REFILL_SPAWN_STORAGE":
                return new RefillSpawnStorage(this.name);
            case "IDLE":
                return new IdleObjective(this.name);
            case "MAINTAIN_BUILDINGS":
                return new MaintainBuildings(this.name);
            case "DEFEND_COLONY":
                return new DefendColony(this.name);
        }
    }

    /**
     * Reload a creep agent and associate it to the current colony
     * @param name name of the creep to reload
     */
    public reloadCreep(name: string) {
        try {
            const agent = new CreepAgent(name);
            this.creeps.push(agent);
        } catch (err) {
            logger.warning(`Unable to reload ${name}: ${err} - discarding from battalion.`);
        }
    }

    /**
     * Execute the objective and all creep agents members of this battalion.
     * Spawn and room agents are not executed as multiple battalion may be referencing the same spawn and room.
     */
    public execute() {
        this.objective.execute(this.creeps, this.roomPlanner, this.spawn);

        for (const creep of this.creeps) {
            creep.execute();
        }

        this.requestNewCreepsIfNecessary();
    }

    public requestNewCreepsIfNecessary() {
        const pendingSpawnRequests = this.spawn.pendingSpawnRequests(this.name);
        const pendingCount = pendingSpawnRequests.reduce((acc, r) => {
            acc[r.creepProfile] = (acc[r.creepProfile] || 0) + r.count;
            return acc;
        }, {} as { [key in CREEP_PROFILE]: number });

        const creepCount = this.creeps.reduce((acc, r) => {
            acc[r.memory.profile] = (acc[r.memory.profile] || 0) + 1;
            return acc;
        }, {} as { [key in CREEP_PROFILE]: number });
        const desired = this.objective.estimateRequiredWorkForce(this.roomPlanner);
        const desiredCount = desired.reduce((acc, r) => {
            acc[r.creepProfile] = (acc[r.creepProfile] || 0) + r.count;
            return acc;
        }, {} as { [key in CREEP_PROFILE]: number });

        const profiles = Object.keys(desiredCount) as CREEP_PROFILE[];
        for (const profile of profiles) {
            const profilePendingCount = pendingCount[profile] || 0;
            const profileCreepCount = creepCount[profile] || 0;
            const profileDesiredCount = desiredCount[profile] || 0;
            if (profilePendingCount + profileCreepCount < profileDesiredCount) {
                const requestCount = profileDesiredCount - profilePendingCount - profileCreepCount;
                logger.info(
                    `${this}: requesting spawn of ${requestCount} creeps ` +
                        `(desired: ${profileDesiredCount}, existing:${profileCreepCount}, pending: ${profilePendingCount})`,
                );
                this.spawn.requestSpawn(this.name, requestCount, profile);
            }
        }
    }

    public assignObjective(objective: BaseObjective) {
        this.objective = objective;
    }

    public save() {
        const roomName = this.roomPlanner.room.name;
        logger.debug(`Saving ${this.objective}`);
        Memory.battalions = Memory.battalions || {};
        Memory.battalions[roomName] = Memory.battalions[roomName] || {};

        Memory.battalions[roomName][this.name] = {
            objective: this.objective.save(),
        };

        for (const creep of this.creeps) {
            logger.debug(`Saving ${creep}`);
            creep.save();
        }
    }

    public toString() {
        return `Battalion ${this.name}`;
    }
}
