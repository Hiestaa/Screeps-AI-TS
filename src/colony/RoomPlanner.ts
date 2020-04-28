import { RoomAgent } from "agents/RoomAgent";
import { SpawnAgent } from "agents/SpawnAgent";
import { PlaceConstructionSites } from "tasks/PlaceConstructionSites";
import { gridFortress } from "utils/layouts/gridFortress";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("colony.RoomPlanner", COLORS.colony);

export class RoomPlanner {
    public room: RoomAgent;
    public spawns: { [key: string]: SpawnAgent };
    public roomPlan: RoomPlan;

    constructor(roomName: string) {
        this.room = new RoomAgent(roomName);
        this.spawns = {};
        this.roomPlan = new RoomPlan(roomName);
    }

    public reloadSpawns(spawns: { [key: string]: SpawnAgent }) {
        this.spawns = spawns;
    }

    public execute() {
        const controllerLevel = this.room.hasControllerLevelChanged();
        if (controllerLevel) {
            this.planNextLevel(controllerLevel);
        }
        this.room.execute();
        // TODO: add a `maintain` function that make sure none of the construction sites in the current room plan
        // have been destroyed due to decay or enemy attacks
    }

    /**
     * Called when controller reaches a new level (upgrade or downgrade)
     * Schedule the construction site placement tasks appropriate to the current level.
     * @param controllerLevel new controller level
     */
    private planNextLevel(controllerLevel: number) {
        this.createSpawnFortress(controllerLevel);
        if (controllerLevel >= 2) {
            this.createExitRamparts();
            this.createSinkAndSourceContainers();
            this.createRoadsBetweenContainers();
        }
    }

    /**
     * Place construction sites to create or expand the spawn fortress around each spawn.
     * @param controllerLevel new controller level
     */
    private createSpawnFortress(controllerLevel: number) {
        for (const spawnName in this.spawns) {
            if (!this.spawns.hasOwnProperty(spawnName)) {
                continue;
            }

            const spawnAgent = this.spawns[spawnName];
            if (spawnAgent.spawnController) {
                const buildUnits = gridFortress(spawnAgent.spawnController.spawn.pos, controllerLevel);
                const container = buildUnits.find(b => b.structureType === STRUCTURE_CONTAINER);
                if (container) {
                    this.roomPlan.addSinkContainer(container.x, container.y);
                    this.roomPlan.addSpawnContainer(container.x, container.y);
                }
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
                this.roomPlan.addSinkContainer(spots[0].x, spots[0].y);
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
                this.roomPlan.addSourceContainer(spot.x, spot.y);
                continue;
            }
        }

        this.room.scheduleTask(new PlaceConstructionSites(buildUnits));
    }

    /**
     * Place construction sites to link sink and source containers with roads.
     */
    private createRoadsBetweenContainers() {
        for (const spawn of this.roomPlan.plan.containers?.spawns || []) {
            for (const source of this.roomPlan.plan.containers?.sources || []) {
                this.buildRoadsBetweenPositions(spawn, source);
            }
            for (const sink of this.roomPlan.plan.containers?.sinks || []) {
                // spawn is a sink as well :)
                if (sink.x !== spawn.x && sink.y !== spawn.y) {
                    this.buildRoadsBetweenPositions(spawn, sink);
                }
            }
        }
    }

    private buildRoadsBetweenPositions(p1: { x: number; y: number }, p2: { x: number; y: number }) {
        const room = this.room.roomController?.room;
        if (!room) {
            logger.warning("Unable to build roads because room controller is undefined");
            return;
        }
        const rp1 = room.getPositionAt(p1.x, p1.y);
        const rp2 = room.getPositionAt(p2.x, p2.y);
        if (rp1 && rp2) {
            const pendingConstructionSites = this.room.taskQueue
                .filter(t => t.getType() === "TASK_PLACE_CONSTRUCTION_SITES")
                .map(t => t.scheduledBuildUnits.concat(t.buildUnitsInProgress));
            const avoidPositions = ([] as IBuildUnit[]).concat
                .apply([], pendingConstructionSites)
                // exclude source and destination
                .filter(({ x, y }) => (p1.x !== x || p1.y !== y) && (p2.x !== x || p2.y !== y))
                .map(({ x, y }) => room.getPositionAt(x, y));
            const path = room.findPath(rp1, rp2, {
                ignoreCreeps: true,
                ignoreRoads: true,
                costCallback: (roomName, costMatrix) => {
                    for (const pos of avoidPositions) {
                        if (pos) {
                            costMatrix.set(pos.x, pos.y, 255);
                        }
                    }
                    return costMatrix;
                },
            });
            if (!path || !path.length) {
                logger.warning(`Unable to find path from position ${p1.x},${p1.y} to ${p2.x},${p2.y}`);
                return;
            }
            this.room.scheduleTask(
                new PlaceConstructionSites(
                    path
                        // exclude source and destination
                        .filter(({ x, y }) => (p1.x !== x && p1.y !== y) || (p2.x !== x && p2.y !== y))
                        .map(({ x, y }) => ({
                            x,
                            y,
                            structureType: STRUCTURE_ROAD,
                        })),
                ),
            );
        } else {
            logger.warning(`Unable to build roads from position ${p1.x},${p1.y} to ${p2.x},${p2.y}`);
        }
    }

    /**
     * Create ramparts to shield all exit to bunker the room.
     */
    private createExitRamparts() {
        const exits = this.room.roomController?.room.find(FIND_EXIT);
        const ramparts = (exits || []).map(exit =>
            AvailableSpotsFinder.estimateAvailableSpots(this.room, exit, [], { min: 2, max: 3 }),
        );

        const sites: IBuildUnit[] = [];
        for (const _ramparts of ramparts) {
            for (const pos of _ramparts) {
                if (!sites.find(item => item.x === pos.x && item.y === pos.y)) {
                    sites.push({ x: pos.x, y: pos.y, structureType: STRUCTURE_RAMPART });
                }
            }
        }
        this.room.scheduleTask(new PlaceConstructionSites(sites));
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

    /**
     * Find available spots at 1 distance from the given position
     * Available spots are non-wall and non-hostile creep essentially
     * @param room agent for related room
     * @param pos relevant position
     * @param hostiles optional hostiles position array to avoid (at 5 position distance)
     */
    public static estimateAvailableSpots(
        room: RoomAgent,
        pos: RoomPosition,
        hostiles?: Array<{ pos: RoomPosition }>,
        range: { min: number; max: number } = { min: 0, max: 2 },
    ): Array<{ x: number; y: number }> {
        if (
            hostiles &&
            hostiles.some(hostile => Math.abs(hostile.pos.x - pos.x) < 5 && Math.abs(hostile.pos.y - pos.y) < 5)
        ) {
            logger.debug(`Found hostile nearby position ${pos}`);
            return [];
        }

        const surroundings = room.roomController?.room.lookAtArea(
            pos.y - (range.max - 1),
            pos.x - (range.max - 1),
            pos.y + (range.max - 1),
            pos.x + (range.max - 1),
            true,
        );
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
            if (Math.abs(item.x - pos.x) < range.min && Math.abs(item.y - pos.y) < range.min) {
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
            .filter(([x, y]) => Math.abs(x - pos.x) >= range.min || Math.abs(y - pos.y) >= range.min)
            .map(([x, y]) => ({ x, y }));
    }
}

class RoomPlan {
    public roomId: string;
    public plan: RoomPlanMemory;
    constructor(roomId: string) {
        this.roomId = roomId;
        this.plan = Memory.roomPlans[this.roomId] || { sources: [], sinks: [], spawns: [] };
        Memory.roomPlans[this.roomId] = this.plan;
    }

    public addSourceContainer(x: number, y: number) {
        this.plan.containers = this.plan.containers || { sources: [], sinks: [], spawns: [] };
        this.plan.containers.sources = this.plan.containers.sources || [];
        const existing = this.plan.containers.sources.find(c => c.x === x && c.y === y);
        if (!existing) {
            this.plan.containers.sources.push({ x, y });
        }
    }

    public addSinkContainer(x: number, y: number) {
        this.plan.containers = this.plan.containers || { sources: [], sinks: [], spawns: [] };
        this.plan.containers.sinks = this.plan.containers.sinks || [];
        const existing = this.plan.containers.sinks.find(c => c.x === x && c.y === y);
        if (!existing) {
            this.plan.containers.sinks.push({ x, y });
        }
    }

    public addSpawnContainer(x: number, y: number) {
        this.plan.containers = this.plan.containers || { sources: [], sinks: [], spawns: [] };
        this.plan.containers.spawns = this.plan.containers.spawns || [];
        const existing = this.plan.containers.spawns.find(c => c.x === x && c.y === y);
        if (!existing) {
            this.plan.containers.spawns.push({ x, y });
        }
    }
}
