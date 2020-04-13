/*
 * Logging utilities for the screeps ai.
 * Logging is scoped by domain. To instantiate a logger, call:
 * `const logger = log.getLogger('my.file.name'[, color])`. Loggers can be enabled
 * and disabled by calling `log.enableLogger('[my[.file[.name]]]'[, color])` or
 * `log.disableLogger('[my[.file[.name]]]').
 * Logging supports the following log levels, which can be enabled and disabled
 * independently by calling `log.enableLevel(level)` or `log.disabledLevel(level)`:
 * Where level is any of :
 * * `debug`: for debugging information about a specific algorithm
 * * `info`: for regular information about the state of the system
 * * `warning`: for unusual things happening in the system, or danger to be aware of
 * * `error`: for algorithms unexpected errors, which can impact the behavior of the AI
 * * `fatal`: errors we cannot recover from, that may interrupt the execution of a tick
 * * `failure`: failures associated with game actions, will be translated as strings
 *              based on the provided error code.
 * Beware that the `logger.failure` method has a different prototype than the other
 * methods, since it takes the error code as parameter on top of the error message.
 */

/* Cache logger instances, this won't persist forever tho
 * hierarchical scoping to speed up activate and deactivate calls
 * (e.g.: loggers.tasks.actor.spawn contains the 'tasks.actor.spawn' logger)
 */

/* Persist loggers state across ticks */
Memory.loggers = Memory.loggers || {};

const LOG_LEVELS: LOG_LEVEL[] = ["debug", "info", "warning", "error", "fatal", "failure"];

const LEVEL_STYLES = {
    debug: "font-size: 11px",
    info: "font-size: 14px",
    warning: "font-size: 16px; style: italic",
    error: "font-size: 18px; font-weight: bold",
    fatal: "font-size: 20px; font-weight: bold; style: italic",
    failure: "font-size: 16px; style: italic",
};

const LEVEL_SEVERITY = {
    debug: 1,
    info: 2,
    warning: 3,
    error: 4,
    fatal: 5,
    failure: 3,
};

const CODE_TO_ERROR = {
    [0]: "OK",
    [-1]: "ERR_NOT_OWNER",
    [-2]: "ERR_NO_PATH",
    [-3]: "ERR_NAME_EXISTS",
    [-4]: "ERR_BUSY",
    [-5]: "ERR_NOT_FOUND",
    [-6]: "ERR_NOT_ENOUGH_RESOURCES",
    [-7]: "ERR_INVALID_TARGET",
    [-8]: "ERR_FULL",
    [-9]: "ERR_NOT_IN_RANGE",
    [-10]: "ERR_INVALID_ARGS",
    [-11]: "ERR_TIRED",
    [-12]: "ERR_NO_BODYPART",
    [-13]: "ERR_NOT_ENOUGH_EXTENSIONS",
    [-14]: "ERR_RCL_NOT_ENOUGH",
    [-15]: "ERR_GCL_NOT_ENOUGH",
};

// https://coolors.co/7c7800-d600c4-0078ce-b51200-422100
export const COLORS = {
    tasks: "7c7800",
    controllers: "#d600c4",
    objectives: "#0078ce",
    phases: "#b51200",
    utils: "#422100",
};

type logFn = (message: string, color: string, highlight?: boolean) => void;

/**
 * LevelLogger is a common object instance that manages the enabled / disabled
 * state of specific log levels.
 * All loggers will call into the same instance, so that all logger levels can
 * be enabled or disabled all at the same time efficiently.
 */
class LevelLogger {
    public debug: logFn = () => null;
    public info: logFn = () => null;
    public warning: logFn = () => null;
    public error: logFn = () => null;
    public fatal: logFn = () => null;
    public failure: logFn = () => null;

    constructor() {
        Memory.loggerLevelEnabled = Memory.loggerLevelEnabled || {
            // default level state, if no state is defined in memory
            debug: true,
            info: true,
            warning: true,
            error: true,
            fatal: true,
            failure: true,
        };
        LOG_LEVELS.forEach(lvl => {
            if (Memory.loggerLevelEnabled[lvl]) {
                this[lvl] = this._log(lvl);
            } else {
                this[lvl] = () => null;
            }
        });
    }

    private _log(level: LOG_LEVEL) {
        return (message: string, color: string, highlight?: boolean) => {
            const levelStyle = LEVEL_STYLES[level] || LEVEL_STYLES.debug;
            const severity = LEVEL_SEVERITY[level] || 0;
            console.log(
                `<font style="${levelStyle}; color: ${color}" ` +
                    (highlight ? 'type="highlight" ' : "") +
                    `color="${color}" severity="${severity}">` +
                    `[${level.toUpperCase()}]${message}</font>`,
            );
        };
    }

    public _enable(level: LOG_LEVEL) {
        Memory.loggerLevelEnabled = Memory.loggerLevelEnabled || {};
        this[level] = this._log(level);
        Memory.loggerLevelEnabled[level] = true;
    }

    public _disable(level: LOG_LEVEL) {
        Memory.loggerLevelEnabled = Memory.loggerLevelEnabled || {};
        this[level] = () => null;
        Memory.loggerLevelEnabled[level] = false;
    }
}

const levelLogger = new LevelLogger();

/**
 * Main class for logging capabilities.
 * Do not instantiate directly, call `logger.getLogger(filename)` instead.
 * The logger will use the file name to index its current state in Memory.
 * Upon instantiation, the default state can be given to be used if no state
 * can be found in memory (by providing a color, the logger will be enabled
 * with that specific color)
 */
export class Logger {
    private filename: string;
    private color: string;

    constructor(filename: string, color: string) {
        this.filename = filename;
        Memory.loggers = Memory.loggers || {};
        let state = Memory.loggers[filename];
        if (!state) {
            Memory.loggers[filename] = state = { color };
        }
        // only enable if a color was provided (indicating enabled by default)
        // or a color was found in memory (indicating it has an enabled state)
        this.color = state.color;
        if (this.color) {
            this.log = this._log;
        }
    }

    private _log(level: LOG_LEVEL, message: string, highlight?: boolean) {
        levelLogger[level](`[${this.filename.toUpperCase()}] ${message}`, this.color, highlight);
    }

    public log = (level: LOG_LEVEL, message: string, highlight?: boolean) => {
        return;
    };

    public _enable(color: string) {
        this.color = color;
        this.log = this._log;
        Memory.loggers[this.filename] = { color };
    }

    public _disable() {
        this.log = () => {
            return;
        };
        Memory.loggers[this.filename] = {};
    }

    public debug(message: string, highlight?: boolean) {
        this.log("debug", message, highlight);
    }

    public info(message: string, highlight?: boolean) {
        this.log("info", message, highlight);
    }

    public warning(message: string, highlight?: boolean) {
        this.log("warning", message, highlight);
    }

    public error(message: string, highlight?: boolean) {
        this.log("error", message, highlight);
    }

    public fatal(message: string, highlight?: boolean) {
        this.log("fatal", message, highlight);
    }

    public failure(code: keyof typeof CODE_TO_ERROR, message: string, highlight?: boolean) {
        message = `[Failure: ${CODE_TO_ERROR[code] || code}] ${message}`;
        this.log("failure", message, highlight);
    }
}

interface ILoggerStoreNode {
    store: ILoggerStore;
    logger?: Logger;
}

interface ILoggerStore {
    [key: string]: ILoggerStoreNode;
}

const loggers: ILoggerStore = {};

const DEFAULT_COLOR = "#777";

/**
 * Returns the logger for the given filename, or create a new logger for the
 * given file name and color and return it.
 * @param {String} filename - filename, should be scoped down by dots (`.`)
 *                            e.g.: `task.actor.Harvest`
 * @param {String} color - default color to apply to this logger, if no
 *                         color state is saved in memory.
 *                         Also enable the logger by default if provided.
 * @return {Logger} - the existing logger instance if it exists, a newly
 *                    built logger instance if it does not.
 */
export function getLogger(filename: string, color?: string): Logger {
    const location = filename.split(".");
    let pointer: ILoggerStoreNode = { store: loggers };

    // go down the scope chain, creating nodes as necessary
    for (const key of location) {
        if (!pointer.store[key]) {
            pointer.store[key] = {
                store: {},
            };
        }

        pointer = pointer.store[key];
    }

    if (!pointer.logger) {
        pointer.logger = new Logger(filename, color || DEFAULT_COLOR);
    }

    return pointer.logger;
}

function recursiveFindAllLoggers(pointer: ILoggerStoreNode): Logger[] {
    const _loggers = [];
    if (pointer.logger) {
        _loggers.push(pointer.logger);
    }

    // each item will return an array of 1 or more loggers
    return _loggers.concat(
        ...Object.keys(pointer.store).map(k => {
            return recursiveFindAllLoggers(pointer.store[k]);
        }),
    );
}

function findLoggers(scope: string): Logger[] {
    let pointer = { store: loggers };
    const location = scope ? scope.split(".") : ["*"];
    for (const key of location) {
        if (key === "*") {
            break;
        } // only allowed as the last item
        if (!pointer.store[key]) {
            pointer.store[key] = { store: {} };
        }
        pointer = pointer.store[key];
    }

    return recursiveFindAllLoggers(pointer);
}

const myLogger = getLogger("utils.Logger", COLORS.utils);

/**
 * Enable all loggers falling under the given scope
 * @param {string} scope - the scope of the loggers to enable, or the string
 *                 '*' to enable all loggers at once.
 *                 e.g. `objectives.actor[.*]` to enable all actor objectives
 * @param {string} color - the color to use for this logger
 * @return {number} - returns the number of loggers affected.
 */
export function enableLogger(scope: string, color: string): number {
    const foundLoggers = findLoggers(scope);
    foundLoggers.forEach(logger => {
        logger._enable(color);
    });
    return foundLoggers.length;
}

/**
 * Disable all logers falling under the given scope
 * @param {string} scope - the scope of the loggers to disable, identical to `enableLogger`
 * @return {number} - return the number of loggers affected.
 */
export function disableLogger(scope: string): number {
    const foundLoggers = findLoggers(scope);
    foundLoggers.forEach(logger => {
        logger._disable();
    });
    return foundLoggers.length;
}

/**
 * Enable the given logging level for all loggers.
 * This is independent from other levels in that 'debug' can solely be enabled
 * without necessarily enabling levels above.
 * @param {LOG_LEVEL} level - level to enablea
 */
export function enableLevel(level: LOG_LEVEL) {
    levelLogger._enable(level);
    if (level !== "failure") {
        myLogger[level](`Logging level ${level} enabled`);
    }
}

/**
 * Disable the given logging level for all loggers.
 * This is independent from other levels in that 'fatal' can solely be disabled
 * without necessarily disabling levels below.
 * @param {LOG_LEVEL} level - level to disable
 */
export function disableLevel(level: LOG_LEVEL) {
    if (level !== "failure") {
        myLogger[level](`Disabling logging level ${level}`);
    }
    levelLogger._disable(level);
}

export function listLoggers() {
    console.log("[INFO][LOG] Currently enabled loggers:");
    Object.keys(Memory.loggers).forEach(k => {
        const logger = Memory.loggers[k];
        const color = logger.color || "#CBCBCB";
        const style = logger.color ? "font-size: 14px" : "font-size: 10px";
        console.log(
            `<font style="${style}; color: ${color}" ` +
                `color="${logger.color}" severity="3">` +
                `                ${k}</font>`,
        );
    });
}
