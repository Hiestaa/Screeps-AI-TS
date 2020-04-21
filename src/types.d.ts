// example declaration file - remove these and add your own custom typings

declare interface IBuildUnit {
    structureType: BuildableStructureConstant;
    x: number;
    y: number;
}

interface BaseTaskMemory {
    executionStarted: boolean;
}

type CREEP_PROFILE = "Harvester" | "Hauler" | "Worker";

interface SpawnRequest {
    count: number;
    battalion: string;
    creepProfile?: CREEP_PROFILE;
    // TODO: type - creep profile (string)
}

interface SpawnTaskMemory extends BaseTaskMemory {
    type: "TASK_SPAWN";
    requests: SpawnRequest[];
}

type CREEP_TASK = "TASK_HARVEST" | "TASK_HAUL" | "TASK_BUILD" | "TASK_HARVEST_NON_STOP" | "TASK_FETCH";

interface CreepTaskMemory extends BaseTaskMemory {
    type: CREEP_TASK;
}

interface HaulTaskMemory extends CreepTaskMemory {
    deliveryTargets: DeliveryTarget[];
}

interface BuildTaskMemory extends CreepTaskMemory {
    buildPriority: STRUCTURE_X[];
}

interface HarvestTaskMemory extends CreepTaskMemory {
    sourceId: string;
}

type ROOM_TASK = "TASK_PLACE_CONSTRUCTION_SITES";

interface RoomTaskMemory extends BaseTaskMemory {
    type: ROOM_TASK;
}

interface PlaceConstructionSitesMemory extends RoomTaskMemory {
    anchor: RoomPosition;
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
    profile?: CREEP_PROFILE;
}

interface SpawnMemory extends BaseMemory {
    tasks: SpawnTaskMemory[];
}

interface RoomMemory extends BaseMemory {
    tasks: PlaceConstructionSitesMemory[];
    controllerLevel: number;
}

type ObjectiveType = "REACH_RCL2" | "REACH_RCL3" | "IDLE" | "CONTINUOUS_HARVESTING";

interface ObjectiveMemory {
    name: ObjectiveType;
}

interface BattalionMemory {
    objective: ObjectiveMemory; // current objective for this battalion
}

interface ColonyBattalionsMemory {
    allPurposeReserve?: BattalionMemory;
    builders?: BattalionMemory;
    haulers?: BattalionMemory;
    harvesters?: BattalionMemory;
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
