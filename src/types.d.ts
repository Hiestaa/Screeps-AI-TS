declare interface IBuildUnit {
    structureType: BuildableStructureConstant;
    x: number;
    y: number;
}

interface BaseTaskMemory {
    executionStarted: boolean;
    executionPaused: number;
}

type CREEP_PROFILE = "GeneralPurpose" | "Harvester" | "Hauler" | "Worker" | "M-Attacker" | "R-Attacker" | "Healer";

interface SpawnRequest {
    count: number;
    battalion: string;
    creepProfile: CREEP_PROFILE;
}

interface SpawnTaskMemory extends BaseTaskMemory {
    type: "TASK_SPAWN";
    request: SpawnRequest;
    spawnDelay: number;
}

type CREEP_TASK =
    | "TASK_HARVEST"
    | "TASK_HAUL"
    | "TASK_BUILD"
    | "TASK_HARVEST_NON_STOP"
    | "TASK_FETCH"
    | "TASK_REPAIR"
    | "TASK_UPGRADE_CONTROLLER"
    | "TASK_HEAL"
    | "TASK_ATTACK"
    | "TASK_RANGED_ATTACK"
    | "TASK_REACH";

interface CreepTaskMemory extends BaseTaskMemory {
    type: CREEP_TASK;
}

interface HaulTaskMemory extends CreepTaskMemory {
    deliveryTargets: DeliveryTarget[];
    excludedPositions: Array<{ x: number; y: number }>;
}

interface FetchTaskMemory extends CreepTaskMemory {
    excludedPositions: Array<{ x: number; y: number }>;
}

interface BuildTaskMemory extends CreepTaskMemory {
    buildPriority: STRUCTURE_X[];
}

interface HarvestTaskMemory extends CreepTaskMemory {
    sourceId: string;
}

interface HealTaskMemory extends CreepTaskMemory {
    currentTarget?: string;
}

interface AttackTaskMemory extends CreepTaskMemory {
    target: string;
}

interface ReachTaskMemory extends CreepTaskMemory {
    destination: { x: number; y: number };
    destinationReached: number;
    noPath: number;
}

type ROOM_TASK = "TASK_PLACE_CONSTRUCTION_SITES";

interface RoomTaskMemory extends BaseTaskMemory {
    type: ROOM_TASK;
}

interface PlaceConstructionSitesMemory extends RoomTaskMemory {
    scheduledBuildUnits: IBuildUnit[];
    buildUnitsInProgress: IBuildUnit[];
}

type TaskMemory = SpawnTaskMemory | CreepTaskMemory | PlaceConstructionSitesMemory;

interface BaseMemory {
    tasks: TaskMemory[];
    idleTime: number;
}

// memory extension samples
interface CreepMemory extends BaseMemory {
    battalion: string;
    tasks: CreepTaskMemory[];
    profile: CREEP_PROFILE;
}

interface SpawnMemory extends BaseMemory {
    tasks: SpawnTaskMemory[];
}

interface RoomMemory extends BaseMemory {
    tasks: PlaceConstructionSitesMemory[];
    controllerLevel: number;
}

type ObjectiveType =
    | "REACH_RCL2"
    | "REACH_RCL3"
    | "IDLE"
    | "CONTINUOUS_HARVESTING"
    | "KEEP_CONT_EXT_FULL"
    | "MAINTAIN_BUILDINGS"
    | "DEFEND_COLONY";

interface ObjectiveMemory {
    name: ObjectiveType;
}

interface ContinuousHarvestingMemory extends ObjectiveMemory {
    miningSpotsPerSource: { [key: string]: number };
}

interface BattalionMemory {
    objective: ObjectiveMemory; // current objective for this battalion
}

interface ColonyBattalionsMemory {
    allPurposeReserve?: BattalionMemory;
    builders?: BattalionMemory;
    haulers?: BattalionMemory;
    harvesters?: BattalionMemory;
    attackers?: BattalionMemory;
    defenders?: BattalionMemory;
}

interface RoomPlanMemory {
    containers?: {
        sources: Array<{ x: number; y: number }>;
        sinks: Array<{ x: number; y: number }>;
        spawns: Array<{ x: number; y: number }>;
    };
    defenderGarrison?: { x: number; y: number };
}

interface Memory {
    Memory: any;
    [x: string]: any;
    loggers: any;
    loggerLevelEnabled: { [key in LOG_LEVEL]: boolean };
    globalCount: number;
    nameCount: [number, number, number];
    roomObjectives: { [key: string]: ObjectiveMemory };
    battalions: ColonyBattalionsMemory;
    roomPlans: { [key: string]: RoomPlanMemory };
}

declare interface RoomPosition {
    toString: (htmlLink?: boolean, id?: string, memWatch?: string) => string;
}

type LOG_LEVEL = "debug" | "info" | "warning" | "error" | "fatal" | "failure";

// `global` extension samples
declare namespace NodeJS {
    interface Global {
        cli: {
            log: {
                [key: string]: (...args: any[]) => string | void;
            };
        };
    }
}

type STRUCTURE_X =
    | STRUCTURE_SPAWN
    | STRUCTURE_EXTENSION
    | STRUCTURE_ROAD
    | STRUCTURE_WALL
    | STRUCTURE_RAMPART
    | STRUCTURE_KEEPER_LAIR
    | STRUCTURE_PORTAL
    | STRUCTURE_CONTROLLER
    | STRUCTURE_LINK
    | STRUCTURE_STORAGE
    | STRUCTURE_TOWER
    | STRUCTURE_OBSERVER
    | STRUCTURE_POWER_BANK
    | STRUCTURE_POWER_SPAWN
    | STRUCTURE_EXTRACTOR
    | STRUCTURE_LAB
    | STRUCTURE_TERMINAL
    | STRUCTURE_CONTAINER
    | STRUCTURE_NUKER
    | STRUCTURE_FACTORY
    | STRUCTURE_INVADER_CORE;

type DeliveryTarget = STRUCTURE_SPAWN | STRUCTURE_CONTAINER | STRUCTURE_CONTROLLER | STRUCTURE_EXTENSION;
type IConstructable<T> = new (...args: any) => T;
