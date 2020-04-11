// example declaration file - remove these and add your own custom typings

// memory extension samples
interface CreepMemory {}

interface Memory {
    loggers: any;
    loggerLevelEnabled: { [key in LOG_LEVEL]: boolean };
    globalCount: number;
}
interface RoomPosition {
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
