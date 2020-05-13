import { SpawnAgent } from "agents/SpawnAgent";
import { TowerAgent } from "agents/TowerAgent";
import { ContinuousHarvesting } from "objectives/ContinuousHarvesting";
import { DefendColony } from "objectives/DefendColony";
import { RefillContainers, RefillSpawnStorage } from "objectives/EnergyHauling";
import { MaintainBuildings } from "objectives/MaintainBuildings";
import { ReachRCL2 } from "objectives/ReachRCL2";
import { ReachRCL3 } from "objectives/ReachRCL3";
import * as cpuUsageEstimator from "utils/cpuUsageEstimator";
import { COLORS, getLogger } from "utils/Logger";
import {
    DEFENDER_BATTALION_CREATE_RCL,
    GENERAL_PURPOSE_BATTALION_PHASE_OUT_RCL,
    HARVESTERS_BATTALION_CREATE_RCL,
    HATCHERS_BATTALION_CREATE_RCL,
    HAULERS_BATTALION_CREATE_RCL,
} from "../constants";
import { Battalion } from "./Battalion";
import { AvailableSpotsFinder, RoomPlanner } from "./RoomPlanner";

const logger = getLogger("colony.Colony", COLORS.colony);

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
            // FIXME: de-correlate battalions from spawn if we want to get battalions to travel to other rooms that have no spawn
            logger.debug(`No spawn in ${room} - not reloading / initializing any battalion`);
            delete Memory.battalions[room.name];
        }

        this.reloadTowers(room);
    }

    private initializeBattalions(spawn: SpawnAgent) {
        const level = this.roomPlanner.room.roomController?.room.controller?.level;

        if (level && level < GENERAL_PURPOSE_BATTALION_PHASE_OUT_RCL && !this.battalions.allPurposeReserve) {
            logger.info(`All Purpose Reserve battalion not found in ${this}. Initializing.`);
            this.battalions.allPurposeReserve = new Battalion("allPurposeReserve", spawn, this.roomPlanner);
            this.battalions.allPurposeReserve.objective = new ReachRCL2("allPurposeReserve");
        }

        if (!this.battalions.builders) {
            this.battalions.builders = new Battalion("builders", spawn, this.roomPlanner);
            this.battalions.builders.objective = new MaintainBuildings("builders");
        }

        if (level && level >= HARVESTERS_BATTALION_CREATE_RCL) {
            if (!this.battalions.harvesters) {
                this.battalions.harvesters = new Battalion("harvesters", spawn, this.roomPlanner);
                this.battalions.harvesters.objective = new ContinuousHarvesting(
                    "harvesters",
                    AvailableSpotsFinder.countMiningSpotsPerSource(this.roomPlanner.room),
                );
            }
        }
        if (level && level >= HATCHERS_BATTALION_CREATE_RCL) {
            if (!this.battalions.hatchers) {
                this.battalions.hatchers = new Battalion("hatchers", spawn, this.roomPlanner);
                this.battalions.hatchers.objective = new RefillSpawnStorage("hatchers");
            }
        }
        if (level && level >= HAULERS_BATTALION_CREATE_RCL) {
            if (!this.battalions.haulers) {
                this.battalions.haulers = new Battalion("haulers", spawn, this.roomPlanner);
                this.battalions.haulers.objective = new RefillContainers("haulers");
            }
        }

        if (level && level >= DEFENDER_BATTALION_CREATE_RCL) {
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

    private reloadTowers(room: Room) {
        const towers = room.find(FIND_STRUCTURES, { filter: structure => structure.structureType === STRUCTURE_TOWER });
        if (towers) {
            for (const tower of towers) {
                const towerId = tower.id;
                const towerAgent = new TowerAgent(room.name, towerId);
                const { battalion: battalionId } = towerAgent.memory;
                const battalion = battalionId && this.battalions[battalionId];
                if (battalion) {
                    battalion.assignTower(towerAgent);
                } else if (this.battalions.defenders) {
                    logger.warning(`${this}: no battalion assigned to ${tower} - assigning defense battalion`);
                    this.battalions.defenders.assignTower(towerAgent);
                } else {
                    logger.debug(`${this}: no defense battalion to assign ${tower} to.`);
                }
            }
        }
    }

    /**
     * Called during the reload phase to reload a creep assigned to this colony (room)
     * Done right after the colony reload phase, not during because there is no direct access to creeps from a given room.
     * @param name creep name
     */
    public reloadCreep(name: string) {
        const mem = Memory.creeps[name];
        if (!mem) {
            logger.warning(`Unable to reload creep ${name} - memory could not be found`);
            return;
        }
        const { battalion: battalionId } = mem;
        const battalion = this.battalions[battalionId];
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
        cpuUsageEstimator.notifyStart(`colony.${this.roomPlanner.room.name}`);
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
        cpuUsageEstimator.notifyComplete();
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
            logger.debug("No allPurposeReserve battalion");
            return;
        }

        const controllerLevel = this.roomPlanner.room.hasControllerLevelChanged();
        if (controllerLevel !== undefined) {
            if (controllerLevel <= 1) {
                logger.warning("Controller reached or downgraded to level 1. ");
                battalion.objective = new ReachRCL2(name);
            }
            if (controllerLevel >= 2) {
                logger.warning("Controller reached or downgraded above level 2. ");
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
