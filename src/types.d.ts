// example declaration file - remove these and add your own custom typings

interface BaseTaskMemory {
    executionStarted: boolean;
}

interface SpawnTaskMemory extends BaseTaskMemory {
    type: "TASK_SPAWN";
    creepCountTarget: number;
}

interface CreepTaskMemory extends BaseTaskMemory {
    type: "TASK_HARVEST" | "TASK_HAUL";
}

interface HaulTaskMemory extends CreepTaskMemory {
    deliveryTargets: DeliveryTarget[];
}

type TaskMemory = SpawnTaskMemory | CreepTaskMemory;

// memory extension samples
interface CreepMemory {
    tasks: TaskMemory[];
}

interface SpawnMemory {
    tasks: TaskMemory[];
}

interface ObjectiveMemory {
    name: "REACH_RCL1";
}

interface Memory {
    loggers: any;
    loggerLevelEnabled: { [key in LOG_LEVEL]: boolean };
    globalCount: number;
    nameCount: [number, number, number];
    objective: ObjectiveMemory;
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

type DeliveryTarget = STRUCTURE_SPAWN | STRUCTURE_CONTAINER | STRUCTURE_CONTROLLER;