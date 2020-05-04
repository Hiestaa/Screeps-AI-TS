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
        this.planDefenderGarrison();

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
            // this.createExitRamparts();
            // this.createSinkAndSourceContainers();
            // this.createRoadsBetweenContainers();
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

    /**
     * Plan the position of the garrison for defenders following a flag named 'Garrison'
     */
    private planDefenderGarrison() {
        if (!this.roomPlan.plan.defenderGarrison) {
            this.roomPlan.plan.defenderGarrison = { x: -1, y: -1 };
        }
        const garrisonFlagTracker = trackedWithFlag('Garrison', COLOR_ORANGE, this.roomPlan.plan.defenderGarrison);
        const findSuitableGarrisonSpace = garrisonFlagTracker(AvailableSpotsFinder.findSuitableGarrisonSpace);

        findSuitableGarrisonSpace(this.room);
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

    // TODO: find other positions relevant to the whole room that would use the same (or derived) unavailability map
    public static findSuitableGarrisonSpace(room: RoomAgent): { x: number; y: number } | null {
        const roomObj = room.roomController?.room;
        if (!roomObj) {
            return null;
        }

        const STRUCT_IGNORE_DIST = 10
        const SPACE_HALF_WIDTH = 4;

        // look at the entire room to determine unavailability level of each case that is
        // 255 for wall terrain or anything 5 squares of enemies
        // 1 for swamp
        // 2 if close (5 square dist) to an owned structure
        const unavailability: { [key: string]: number } = {};
        const unavailableInRange = (rx: number, ry: number, cx: number, cy: number, u: (x: number, y: number) => number) => {
            for (let x = 0; x < rx * 2; x++) {
                for (let y = 0; y < ry * 2; y++) {
                    const sx = cx - rx + x;
                    const sy = cy - ry + y;
                    const sign2 = `${sx},${sy}`;
                    unavailability[sign2] = Math.max(unavailability[sign2] || 0, u(sx, sy));
                }
            }
        };
        const dist = (x1: number, y1: number, x2: number, y2: number) => {
            return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2))
        }
        const invDistScore = (item: LookAtResultWithPos) => (sx: number, sy: number) => Math.max(0, STRUCT_IGNORE_DIST - dist(sx, sy, item.x, item.y))
        const surroundings = room.roomController?.room.lookAtArea(0, 0, 49, 49, true);

        for (const item of surroundings || []) {
            const sign = `${item.x},${item.y}`;
            if (unavailability[sign] === undefined && item.type === "terrain" && item.terrain !== undefined) {
                unavailability[sign] = { wall: 255, swamp: 1, plain: 0 }[item.terrain];
            }
            if (item.type === "creep" && !item.creep?.my) {
                unavailableInRange(5, 5, item.x, item.y, () => 255);
            }
            if (item.type === "structure") {
                const ownedStructure = (item.structure as OwnedStructure);
                if (ownedStructure && ownedStructure.owner) {
                    unavailableInRange(STRUCT_IGNORE_DIST, STRUCT_IGNORE_DIST, item.x, item.y, ownedStructure.my ? invDistScore(item) : () => 255);

                }
            }
            if (item.type === 'source') {
                unavailableInRange(STRUCT_IGNORE_DIST, STRUCT_IGNORE_DIST, item.x, item.y, invDistScore(item));

            }
        }

        // then, starting from the middle of the room and spiraling towards the edges,
        // slide a 5*5 square and retain the minimum unavailability sum of the cases under that square
        // if 0 is found, pick that square as the garrison
        // if the edge of the board is reached, pick the square that had the minimum unavailability
        let bestScore: number | null = null;
        let bestPos: { x: number, y: number } | null = null;
        for (let cx = 5; cx < 45; cx++) {
            for (let cy = 5; cy < 45; cy++) {
                const x = (20 + cx) < 45 ? (20 + cx) : (cx - 20);
                const y = (20 + cy) < 45 ? (20 + cy) : (cy - 20);
                let score = 0;
                for (let x2 = x - SPACE_HALF_WIDTH; x2 < x + SPACE_HALF_WIDTH; x2++) {
                    for (let y2 = y - SPACE_HALF_WIDTH; y2 < y - SPACE_HALF_WIDTH + 5; y2++) {
                        score += unavailability[`${x2},${y2}`] || 0;
                    }
                }

                // TODO[OPTIMIZATION] Stop early
                // if (score === 0) {
                //     return { x, y };
                // } else
                if (bestScore === null || score < bestScore) {
                    bestScore = score;
                    bestPos = { x, y };
                    roomObj.visual.text(`${unavailability[`${x},${y}`] || 0} `, x, y - 0.1, {
                        font: 0.3
                    });

                    roomObj.visual.text(`${score}`, x, y + 0.3, {
                        font: 0.3
                    });

                }
                else {
                    // // TODO[OPTIMIZATION] remove room visuals
                    roomObj.visual.text(`${unavailability[`${x},${y}`] || 0} `, x, y - 0.1, {
                        font: 0.2,
                        color: '#999999',
                    });

                    roomObj.visual.text(`${score}`, x, y + 0.3, {
                        font: 0.2,
                        color: '#999999',

                    });

                }
            }
        }

        return bestPos;
    }
}

class RoomPlan {
    public roomId: string;
    public plan: RoomPlanMemory;
    constructor(roomId: string) {
        this.roomId = roomId;
        this.plan = Memory.roomPlans[this.roomId] || this.emptyPlan();
        Memory.roomPlans[this.roomId] = this.plan;
    }

    private emptyPlan(): RoomPlanMemory {
        return { containers: { sources: [], sinks: [], spawns: [] }, defenderGarrison: { x: -1, y: -1 } };
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

    public addDefenderGarrison(x: number, y: number) {
        this.plan.defenderGarrison = { x, y };
    }
}

function findFlag(room: RoomAgent, name: string): Flag | null {
    const flag = room.roomController?.room.find(FIND_FLAGS, {
        filter: _flag => _flag.name === name,
    });
    if (flag && flag.length > 0) {
        return flag[0];
    }
    return null;
}

/**
 * Decorator factory for functions that automatically determine a position
 * to add the ability to track such position using a specifically named flag.
 * This allows both to see where the automatic positioning landed, and to modify it manually as needed.
 * @param name name of the flag to use as tracker
 * @param color color of the flag (not used for filtering)
 * @param memoryLoc location of the position stored in memory
 */
function trackedWithFlag(name: string, color: ColorConstant, memoryLoc: { x: number, y: number }) {
    return (fn: (room: RoomAgent) => { x: number, y: number } | null) => {
        return (room: RoomAgent): { x: number, y: number } | null => {
            const flag = findFlag(room, name);
            if (flag && (flag.pos.x !== memoryLoc.x || flag.pos.y !== memoryLoc.y)) {
                logger.warning(`${name} flag location changed - updating ${name} location to ${flag.pos}.`);
                memoryLoc.x = flag.pos.x;
                memoryLoc.y = flag.pos.y;
                return memoryLoc;
            }

            if (memoryLoc.x >= 0 && memoryLoc.y >= 0) {
                return memoryLoc
            }

            logger.info(`'${name} flag not found - attempt at auto-determining position`);
            const location = fn(room);
            if (location) {
                memoryLoc.x = location.x
                memoryLoc.y = location.y

                room.roomController?.room.createFlag(location.x, location.y, name, color);

                return memoryLoc;
            }

            return null;
        }
    }
}
