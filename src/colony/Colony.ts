import { RoomAgent } from "agents/RoomAgent";
import { SpawnAgent } from "agents/SpawnAgent";
import { IdleObjective } from "objectives/IObjective";
import { ReachRCL2 } from "objectives/ReachRCL2";
import { ReachRCL3 } from "objectives/ReachRCL3";
import { PlaceConstructionSites } from "tasks/PlaceConstructionSites";
import { COLORS, getLogger } from "utils/Logger";
import { Battalion } from "./Battalion";

const logger = getLogger("colony.Colony", COLORS.colony);

/**
 * A colony is represents the settlement of a particular room.
 * It is associated with one spawn (for now) and organizes creeps into battalions, groups of agents
 * collaborating to achieve an objective.
 * The colony orchestrates these battalions, creating new ones as the colony grows and assigning objectives
 * applicable to the current room control level.
 */
export class Colony {
    public room: RoomAgent;
    public spawns: { [key: string]: SpawnAgent };
    public battalions: { [key in keyof ColonyBattalionsMemory]: Battalion };

    public constructor(room: Room) {
        this.battalions = {};
        this.spawns = {};
        this.room = new RoomAgent(room.name);

        this.reload();
    }

    /**
     * Reload the spawn, battalions and objective for this colony
     * May raise an error if the room is not controlled anymore, or if no spawn can be found in this room.
     * (mechanism for recovering the room in case of destroy to be improved)
     */
    private reload() {
        if (!this.room.roomController) {
            return;
        }

        const spawns = this.room.roomController.room.find(FIND_MY_SPAWNS);
        let firstSpawn: SpawnAgent | null = null;

        for (const spawn of spawns) {
            logger.debug(`Reloading spawn ${spawn}`);
            const spawnAgent = this.reloadSpawn(spawn.name);
            if (spawnAgent && !firstSpawn) {
                firstSpawn = spawnAgent;
            }
        }

        // TODO: in case of multiple spawn available, better battalion / spawn dispatch
        // than assigning the first spawn to every battalion
        if (firstSpawn) {
            const battalionIds = Object.keys(Memory.battalions) as Array<keyof ColonyBattalionsMemory>;
            for (const battalionId of battalionIds) {
                logger.debug(`Reloading battalion ${battalionId} in ${this}`);
                this.battalions[battalionId] = new Battalion(battalionId, firstSpawn, this.room);
            }

            if (!this.battalions.allPurposeReserve) {
                logger.info(`All Purpose Reserve battalion not found in ${this}. Initializing.`);
                this.battalions.allPurposeReserve = new Battalion("allPurposeReserve", firstSpawn, this.room);
            }
        } else {
            logger.warning(`No spawn in ${this.room} - not reloading / initializing any battalion`);
        }
    }

    private reloadSpawn(name: string): SpawnAgent | undefined {
        try {
            const agent = new SpawnAgent(name);
            this.spawns[name] = agent;
            return agent;
        } catch (err) {
            logger.warning(`Unable to reload ${name}: ${err} - discarding from colony.`);
            return;
        }
    }

    /**
     * Called during the reload phase to reload a creep assigned to this colony (room)
     * @param name creep name
     */
    public reloadCreep(name: string) {
        const mem = Memory.creeps[name];
        if (!mem) {
            logger.warning(`Unable to reload creep ${name} - memory could not be found`);
            return;
        }
        const { battalion: battalionId } = mem;
        const battalion = this.battalions[battalionId as keyof ColonyBattalionsMemory];
        if (battalion) {
            battalion.reloadCreep(name);
        }
    }

    /**
     * Execute colony agents in the following orders:
     * * RoomAgent, so the required construction sites can be placed for creeps to build
     * * Battalions, to perform all creep actions and possibly send new spawn requests
     * * Spawns, to execute spawn requests
     */
    public execute() {
        this.assignRoomTasks();

        logger.debug(`Executing ${this.room}`);
        this.room.execute();

        const battalionIds = Object.keys(this.battalions) as Array<keyof ColonyBattalionsMemory>;
        for (const battalionId of battalionIds) {
            const battalion = this.battalions[battalionId];
            if (battalion) {
                logger.debug(`Executing ${battalion}`);
                battalion.execute();
            }
        }

        for (const spawn in this.spawns) {
            if (this.spawns.hasOwnProperty(spawn)) {
                logger.debug(`Executing ${this.spawns[spawn]}`);
                this.spawns[spawn].execute();
            }
        }

        this.transitionObjectives();
    }

    // TODO: use a room planner for smarter construction site placement
    private assignRoomTasks() {
        if (this.room.hasTaskScheduled("TASK_PLACE_CONSTRUCTION_SITES")) {
            return;
        }

        for (const spawnName in this.spawns) {
            if (!this.spawns.hasOwnProperty(spawnName)) {
                continue;
            }

            const spawnAgent = this.spawns[spawnName];
            if (spawnAgent.spawnController) {
                this.room.scheduleTask(new PlaceConstructionSites(spawnAgent.spawnController.spawn.pos));
            }
        }
    }

    /**
     * Examine the state of the colony and assign new objectives to appropriate battalions when necessary.
     */
    private transitionObjectives() {
        this.transitionAllPurposeReserveObjective();
        // TODO: all other battalions
    }

    private transitionAllPurposeReserveObjective() {
        const name = "allPurposeReserve";
        const battalion = this.battalions[name];
        if (!battalion) {
            logger.warning("No allPurposeReserve battalion");
            return;
        }

        const controllerLevel = this.room.roomController?.room.controller?.level;
        if (controllerLevel !== undefined) {
            if (controllerLevel <= 1 && battalion.objective.name !== "REACH_RCL2") {
                logger.warning("Controller reached or downgraded to level 1. ");
                battalion.objective = new ReachRCL2(name);
            }
            if (controllerLevel === 2 && battalion.objective.name !== "REACH_RCL3") {
                logger.warning("Controller reached or downgraded to level 2. ");
                battalion.objective = new ReachRCL3(name);
            }
        } else if (battalion.objective.name !== "IDLE") {
            logger.warning(`No room controller for room: ${this.room.name} - assigning idle objective to ${battalion}`);
            battalion.objective = new IdleObjective(name);
        }
    }

    public save() {
        logger.debug(`Saving ${this.room}`);
        this.room.save();

        const battalionIds = Object.keys(this.battalions) as Array<keyof ColonyBattalionsMemory>;
        for (const battalionId of battalionIds) {
            const battalion = this.battalions[battalionId];
            if (battalion) {
                logger.debug(`Saving ${battalion}`);
                battalion.save();
            }
        }

        for (const spawn in this.spawns) {
            if (this.spawns.hasOwnProperty(spawn)) {
                logger.debug(`Saving ${this.spawns[spawn]}`);
                this.spawns[spawn].save();
            }
        }
    }

    public toString() {
        return `Colony in ${this.room}`;
    }
}
