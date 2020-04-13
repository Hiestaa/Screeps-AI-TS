// example declaration file - remove these and add your own custom typings

interface BaseTaskMemory {
    executionStarted: boolean;
}

interface SpawnTaskMemory extends BaseTaskMemory {
    type: "TASK_SPAWN";
    target: number;
}

interface CreepTaskMemory extends BaseTaskMemory {
    type: "TASK_HARVEST" | "TASK_HAUL";
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
