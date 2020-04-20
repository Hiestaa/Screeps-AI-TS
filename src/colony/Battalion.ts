import { CreepAgent } from "agents/CreepAgent";
import { RoomAgent } from "agents/RoomAgent";
import { SpawnAgent } from "agents/SpawnAgent";
import { BaseObjective, IdleObjective } from "objectives/IObjective";
import { ReachRCL2 } from "objectives/ReachRCL2";
import { ReachRCL3 } from "objectives/ReachRCL3";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("colony.Battalion", COLORS.colony);

type ReloadableObjective = IConstructable<BaseObjective>;

const DESIRED_CREEP_COUNT = 7;

/**
 * Controls a group of agents collaborating to achieve an objective.
 */
export class Battalion {
    public creeps: CreepAgent[] = [];
    public spawn: SpawnAgent;
    public room: RoomAgent;
    public objective: BaseObjective;
    public memory: BattalionMemory;
    public name: keyof ColonyBattalionsMemory;

    constructor(name: keyof ColonyBattalionsMemory, spawn: SpawnAgent, room: RoomAgent) {
        this.spawn = spawn;
        this.room = room;
        this.name = name;

        this.memory = Memory.battalions[name] || {
            objective: {
                name: "IDLE",
            },
        };

        this.objective = this.reloadObjective();
    }

    private reloadObjective() {
        const getObjectiveClass = (objectiveType: ObjectiveType): ReloadableObjective => {
            switch (objectiveType) {
                case "REACH_RCL2":
                    return ReachRCL2;
                case "REACH_RCL3":
                    return ReachRCL3;
                case "IDLE":
                    return IdleObjective;
            }
        };

        const Objective = getObjectiveClass(this.memory.objective.name);
        const objective = new Objective(this.room.name);
        objective.reload(this.memory.objective);
        return objective;
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
        this.objective.execute(this.creeps);

        for (const creep of this.creeps) {
            creep.execute();
        }

        this.requestNewCreepsIfNecessary();
    }

    public requestNewCreepsIfNecessary() {
        const pendingSpawnRequests = this.spawn.pendingSpawnRequests(this.name);
        const pendingCount = pendingSpawnRequests.reduce((acc, req) => acc + req.count, 0);
        const creepCount = this.creeps.length;

        if (pendingCount + creepCount < DESIRED_CREEP_COUNT) {
            this.spawn.requestSpawn(this.name, DESIRED_CREEP_COUNT - pendingCount - creepCount);
        }
    }

    public assignObjective(objective: BaseObjective) {
        this.objective = objective;
    }

    public save() {
        logger.debug(`Saving ${this.objective}`);
        Memory.battalions[this.name] = {
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
