import { RoomAgent } from "agents/RoomAgent";
import { SpawnAgent } from "agents/SpawnAgent";
import { PlaceConstructionSites } from "tasks/PlaceConstructionSites";
import { gridFortress } from "utils/layouts/gridFortress";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("colony.RoomPlanner", COLORS.colony);

export class RoomPlanner {
    public room: RoomAgent;
    public spawns: { [key: string]: SpawnAgent };

    constructor(room: RoomAgent, spawns: { [key: string]: SpawnAgent }) {
        this.room = room;
        this.spawns = spawns;
    }

    public execute() {
        const controllerLevel = this.room.hasControllerLevelChanged();
        if (controllerLevel) {
            this.planNextLevel(controllerLevel);
        }
    }

    /**
     * Called when controller reaches a new level (upgrade or downgrade)
     * Schedule the construction site placement tasks appropriate to the current level.
     * @param controllerLevel new controller level
     */
    private planNextLevel(controllerLevel: number) {
        // this.createSpawnFortress(controllerLevel);
        if (controllerLevel >= 2) {
            this.createSinkAndSourceContainers();
        }
        if (controllerLevel >= 2) {
            // TODO change to 2
            this.createRoadsBetweenContainers();
            this.createExitRamparts();
        }
    }

    /**
     * Place construction sites to create or expand the spawn fortress around each spawn.
     * @param controllerLevel new controller level
     */
    private createSpawnFortress(controllerLevel: number) {
        if (this.room.hasTaskScheduled("TASK_PLACE_CONSTRUCTION_SITES")) {
            return;
        }
        for (const spawnName in this.spawns) {
            if (!this.spawns.hasOwnProperty(spawnName)) {
                continue;
            }

            const spawnAgent = this.spawns[spawnName];
            if (spawnAgent.spawnController) {
                const buildUnits = gridFortress(spawnAgent.spawnController.spawn.pos, controllerLevel);
                this.room.scheduleTask(new PlaceConstructionSites(buildUnits));
            }
        }
    }

    /**
     * place construction sites to create sink and source containers.
     * There will be one container nearby the room controller, one per spawn (from the spawn fortress layout) and
     * one per source up to the max number of containers available.
     * This function might be broken down further if dedicated layouts are applied to sources and RCL
     */
    private createSinkAndSourceContainers() {
        const miningSpotsPerSource = AvailableSpotsFinder.findMiningSpotsPerSource(this.room);
        const buildUnits: IBuildUnit[] = [];

        const controller = this.room.roomController?.room.controller;
        if (controller) {
            const { pos } = controller;
            const spots = AvailableSpotsFinder.estimateAvailableSpots(this.room, pos);
            if (spots.length > 0) {
                buildUnits.push({ structureType: "container", ...spots[0] });
            }
        }

        for (const sourceId in miningSpotsPerSource) {
            if (miningSpotsPerSource.hasOwnProperty(sourceId)) {
                const spots = miningSpotsPerSource[sourceId];
                if (spots.length === 0) {
                    continue;
                }
                const spot = spots[0];

                buildUnits.push({ structureType: "container", ...spot });

                continue;
            }
        }

        this.room.scheduleTask(new PlaceConstructionSites(buildUnits));
    }

    /**
     * Place construction sites to link sink and source containers with roads.
     */
    private createRoadsBetweenContainers() {
        return;
    }

    /**
     * Create ramparts to shield all exit to bunker the room.
     */
    private createExitRamparts() {
        return;
    }
}

interface IMiningSpotsStore {
    [key: string]: Array<{ x: number; y: number }>;
}

export class AvailableSpotsFinder {
    public static countMiningSpotsPerSource(room: RoomAgent): { [key: string]: number } {
        const miningSpotsPerSource = AvailableSpotsFinder.findMiningSpotsPerSource(room);
        const count: { [key: string]: number } = {};
        for (const sourceId in miningSpotsPerSource) {
            if (miningSpotsPerSource.hasOwnProperty(sourceId)) {
                count[sourceId] = miningSpotsPerSource[sourceId].length;
            }
        }
        return count;
    }

    public static findMiningSpotsPerSource(room: RoomAgent): IMiningSpotsStore {
        const miningSpotsPerSource: IMiningSpotsStore = {};
        const sources = room.roomController?.room.find(FIND_SOURCES_ACTIVE);
        if (!sources) {
            return {};
        }

        const hostiles = ([] as Array<{ pos: RoomPosition }>).concat(
            room.roomController?.room.find(FIND_HOSTILE_SPAWNS) || [],
            room.roomController?.room.find(FIND_HOSTILE_CREEPS) || [],
            room.roomController?.room.find(FIND_HOSTILE_STRUCTURES) || [],
        );

        for (const source of sources) {
            // TODO: when creeps are powerful enough, one will drain the source entirely by himself before the source replenishes
            // might be relevant past a certain point to only retain the first mining spot here.
            miningSpotsPerSource[source.id] = this.estimateAvailableSpots(room, source.pos, hostiles);
        }

        return miningSpotsPerSource;
    }

    public static estimateAvailableSpots(
        room: RoomAgent,
        pos: RoomPosition,
        hostiles?: Array<{ pos: RoomPosition }>,
    ): Array<{ x: number; y: number }> {
        if (
            hostiles &&
            hostiles.some(hostile => Math.abs(hostile.pos.x - pos.x) < 5 && Math.abs(hostile.pos.y - pos.y) < 5)
        ) {
            logger.debug(`Found hostile nearby position ${pos}`);
            return [];
        }

        const surroundings = room.roomController?.room.lookAtArea(pos.y - 1, pos.x - 1, pos.y + 1, pos.x + 1, true);
        if (!surroundings) {
            return [];
        }

        const available: { [key: string]: boolean } = {};
        for (const item of surroundings) {
            const sign = `${item.x},${item.y}`;
            if (available[sign] === undefined && item.type === "terrain" && item.terrain !== "wall") {
                available[sign] = true;
            }
            if (item.type === "terrain" && item.terrain === "wall") {
                available[sign] = false;
            }
            if (item.type === "creep" && !item.creep?.my) {
                return []; // avoid enemy creep...
            }
            // TODO: more type of unavailable items;
        }

        return Object.keys(available)
            .filter(k => available[k])
            .map(k => k.split(",").map(n => parseInt(n, 10)))
            .map(([x, y]) => ({ x, y }));
    }
}
