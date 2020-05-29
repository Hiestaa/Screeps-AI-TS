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
    battalion: keyof ColonyBattalionsMemory;
    creepProfile: CREEP_PROFILE;
}

interface SpawnTaskMemory extends BaseTaskMemory {
    type: "TASK_SPAWN";
    request: SpawnRequest;
    spawnDelay: number;
}

interface TowerTaskMemory extends BaseTaskMemory {
    type: "TASK_TOWER";
    currentHealTarget?: string;
    currentAttackTarget?: string;
    currentRepairTarget?: string;
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

type FETCH_TARGETS =
    | FIND_TOMBSTONES
    | FIND_RUINS
    | FIND_DROPPED_RESOURCES
    | STRUCTURE_CONTAINER
    | STRUCTURE_STORAGE
    | FIND_SOURCES_ACTIVE;

interface FetchTaskMemory extends CreepTaskMemory {
    targetPriority: FETCH_TARGETS[];
    excludedPositions: Array<{ x: number; y: number }>;
    lastFetchTargetId?: string;
    lastFetchTargetType?: FETCH_TARGETS;
    lockedAmount?: number;
    roomResourceLock?: string;
}

interface BuildTaskMemory extends CreepTaskMemory {
    buildPriority: StructureConstant[];
}

interface RepairTaskMemory extends CreepTaskMemory {
    forced: boolean;
    currentTarget?: string;
}

interface HarvestTaskMemory extends CreepTaskMemory {
    sourceId: string;
    from?: { x: number; y: number };
}

interface HealTaskMemory extends CreepTaskMemory {
    following?: string;
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

type TaskMemory = SpawnTaskMemory | CreepTaskMemory | PlaceConstructionSitesMemory | TowerTaskMemory;

type TASK_TYPE = "TASK_SPAWN" | CREEP_TASK | "TASK_PLACE_CONSTRUCTION_SITES" | "TASK_TOWER";

// data a task can request to save after completion for use by a subsequent task
interface PersistTaskMemory {
    prevTask: TASK_TYPE;
    lastFetchTargetId?: string;
}

interface BaseMemory {
    tasks: TaskMemory[];
    idleTime: number;
    prevTaskPersist?: PersistTaskMemory;
}
// memory extension samples
interface CreepMemory extends BaseMemory {
    battalion: keyof ColonyBattalionsMemory;
    tasks: CreepTaskMemory[];
    profile: CREEP_PROFILE;
}

interface SpawnMemory extends BaseMemory {
    tasks: SpawnTaskMemory[];
}

interface TowerMemory extends BaseMemory {
    battalion: keyof ColonyBattalionsMemory;
    tasks: TowerTaskMemory[];
}

interface RoomMemory extends BaseMemory {
    tasks: PlaceConstructionSitesMemory[];
    controllerLevel: number;
    towers: { [key: string]: TowerMemory };
}

type ObjectiveType =
    | "REACH_RCL2"
    | "REACH_RCL3"
    | "IDLE"
    | "CONTINUOUS_HARVESTING"
    | "REFILL_CONTAINERS"
    | "REFILL_SPAWN_STORAGE"
    | "MAINTAIN_BUILDINGS"
    | "DEFEND_COLONY";

interface ObjectiveMemory {
    name: ObjectiveType;
}

interface ContinuousHarvestingMemory extends ObjectiveMemory {
    miningSpotsPerSource: { [key: string]: number };
}

interface DefendColonyMemory extends ObjectiveMemory {
    attackLaunched: boolean;
}

interface BattalionMemory {
    objective: ObjectiveMemory; // current objective for this battalion
}

interface ColonyBattalionsMemory {
    allPurposeReserve?: BattalionMemory;
    builders?: BattalionMemory;
    haulers?: BattalionMemory;
    hatchers?: BattalionMemory;
    harvesters?: BattalionMemory;
    attackers?: BattalionMemory;
    defenders?: BattalionMemory;
}

interface RoomPlanMemory {
    containers?: {
        sources: Array<{ x: number; y: number; sourceId: string }>;
        sinks: Array<{ x: number; y: number }>;
        spawn?: { x: number; y: number };
    };
    defenderGarrison?: { x: number; y: number };
    spawnFortresses?: { [key: string]: IBuildUnit[] };
    roads?: Array<{ x: number; y: number }>;
    ramparts?: Array<{ x: number; y: number }>;
    mainSpawn?: { x: number; y: number; name: string };
}

interface Memory {
    Memory: any;
    [x: string]: any;
    loggers: any;
    loggerLevelEnabled: { [key in LOG_LEVEL]: boolean };
    globalCount: number;
    nameCount: [number, number, number];
    roomObjectives: { [key: string]: ObjectiveMemory };
    battalions: { [key: string]: ColonyBattalionsMemory };
    roomPlans: { [key: string]: RoomPlanMemory };
    prevNow: number;
    prevDuration: number;
    prevDurations: number[];
    cpuUsageEstimator: { enabled: boolean; depth: number };
    resourceLocks: { [key in 'constructionSites' | 'structures' | 'resources']: { [key: string]: { [key: string]: number } } };
    resourceLockers: { [key: string]: { [key: string]: number } };
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
            pause: () => void;
            resume: () => void;
            queryTickTimer: () => void;
            enableCpuUsageEstimator: (depth?: number) => void;
            disableCpuUsageEstimator: () => void;
        };
        tmpCache: {
            debugFlag: boolean;
        };
    }
}

type DeliveryTarget =
    | STRUCTURE_SPAWN
    | STRUCTURE_CONTAINER
    | STRUCTURE_CONTROLLER
    | STRUCTURE_EXTENSION
    | STRUCTURE_STORAGE
    | STRUCTURE_TOWER;

type IConstructable<T> = new (...args: any) => T;
