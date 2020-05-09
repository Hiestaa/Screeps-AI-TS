import { SpawnAgent } from "agents/SpawnAgent";
import { IdleObjective } from "objectives/BaseObjective";
import { ContinuousHarvesting } from "objectives/ContinuousHarvesting";
import { DefendColony } from "objectives/DefendColony";
import { RefillContainers, RefillSpawnStorage } from "objectives/EnergyHauling";
import { MaintainBuildings } from "objectives/MaintainBuildings";
import { ReachRCL2 } from "objectives/ReachRCL2";
import { ReachRCL3 } from "objectives/ReachRCL3";
import { COLORS, getLogger } from "utils/Logger";
import { Battalion } from "./Battalion";
import { AvailableSpotsFinder, RoomPlanner } from "./RoomPlanner";

const logger = getLogger("colony.Colony", COLORS.colony);

const GP_BATTALION_PHASE_OUT_LEVEL = 2;

/**
 * A colony is represents the settlement of a particular room.
 * It is associated with one spawn (for now) and organizes creeps into battalions, groups of agents
 * collaborating to achieve an objective.
 * The colony orchestrates these battalions, creating new ones as the colony grows and assigning objectives
 * applicable to the current room control level.
 */
export class Colony {
    public spawns: { [key: string]: SpawnAgent };
    public battalions: { [key in keyof ColonyBattalionsMemory]: Battalion };
    public roomPlanner: RoomPlanner;

    public constructor(room: Room) {
        this.battalions = {};
        this.spawns = {};
        this.roomPlanner = new RoomPlanner(room.name);

        this.reload(room);
    }

    /**
     * Reload the spawn, battalions and objective for this colony
     * May raise an error if the room is not controlled anymore, or if no spawn can be found in this room.
     * (mechanism for recovering the room in case of destroy to be improved)
     */
    private reload(room: Room) {
        const spawns = room.find(FIND_MY_SPAWNS);
        let firstSpawn: SpawnAgent | null = null;

        for (const spawn of spawns) {
            logger.debug(`Reloading spawn ${spawn}`);
            const spawnAgent = this.reloadSpawn(spawn.name);
            if (spawnAgent && !firstSpawn) {
                firstSpawn = spawnAgent;
            }
        }

        this.roomPlanner.reloadSpawns(this.spawns);

        // TODO: in case of multiple spawn available, better battalion / spawn dispatch
        // than assigning the first spawn to every battalion
        const battalionsMemory = Memory.battalions[room.name] || {};
        if (firstSpawn) {
            const battalionIds = Object.keys(battalionsMemory) as Array<keyof ColonyBattalionsMemory>;
            for (const battalionId of battalionIds) {
                logger.debug(`Reloading battalion ${battalionId} in ${this}`);
                this.battalions[battalionId] = new Battalion(battalionId, firstSpawn, this.roomPlanner);
            }

            this.initializeBattalions(firstSpawn);
        } else {
            logger.warning(`No spawn in ${room} - not reloading / initializing any battalion`);
        }
    }

    private initializeBattalions(spawn: SpawnAgent) {
        const level = this.roomPlanner.room.roomController?.room.controller?.level;

        // FIXME: This is run at init time only, it won't delete the battalion past RCL4
        if (level && level <= 4 && !this.battalions.allPurposeReserve) {
            logger.info(`All Purpose Reserve battalion not found in ${this}. Initializing.`);
            this.battalions.allPurposeReserve = new Battalion("allPurposeReserve", spawn, this.roomPlanner);
            this.battalions.allPurposeReserve.objective = new ReachRCL2("allPurposeReserve");
        }

        if (!this.battalions.builders) {
            this.battalions.builders = new Battalion("builders", spawn, this.roomPlanner);
            this.battalions.builders.objective = new MaintainBuildings("builders");
        }

        if (level && level >= 2) {
            if (!this.battalions.harvesters) {
                this.battalions.harvesters = new Battalion("harvesters", spawn, this.roomPlanner);
                this.battalions.harvesters.objective = new ContinuousHarvesting(
                    "harvesters",
                    AvailableSpotsFinder.countMiningSpotsPerSource(this.roomPlanner.room),
                );
            }
        }
        if (level && level >= 2) {
            if (!this.battalions.hatchers) {
                this.battalions.hatchers = new Battalion("hatchers", spawn, this.roomPlanner);
                this.battalions.hatchers.objective = new RefillSpawnStorage("hatchers");
            }
        }
        if (level && level >= 3) {
            if (!this.battalions.haulers) {
                this.battalions.haulers = new Battalion("haulers", spawn, this.roomPlanner);
                this.battalions.haulers.objective = new RefillContainers("haulers");
            }
        }

        if (level && level >= 8) {
            // requesting defenders without extension blocks the spawn - consider waiting until these are built?
            // TODO: we really need a state machine...
            if (!this.battalions.defenders) {
                this.battalions.defenders = new Battalion("defenders", spawn, this.roomPlanner);
                this.battalions.defenders.objective = new DefendColony("defenders");
            }
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
        logger.debug(`Executing ${this}`);
        this.roomPlanner.execute();

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

        const controllerLevel = this.roomPlanner.room.hasControllerLevelChanged();
        if (controllerLevel !== undefined) {
            if (controllerLevel <= 1) {
                logger.warning("Controller reached or downgraded to level 1. ");
                battalion.objective = new ReachRCL2(name);
            }
            if (controllerLevel >= 2) {
                logger.warning("Controller reached or downgraded to level 2. ");
                battalion.objective = new ReachRCL3(name);
            }
            // TODO: delete the battalion
            // if (controllerLevel >= GP_BATTALION_PHASE_OUT_LEVEL) {
            //     battalion.objective = new IdleObjective(name);
            // }
        }
    }

    public save() {
        logger.debug(`Saving ${this.roomPlanner.room}`);
        this.roomPlanner.room.save();

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
        return `Colony in ${this.roomPlanner.room}`;
    }
}
