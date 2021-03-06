import * as cpuUsageEstimator from "utils/cpuUsageEstimator";

import { act } from "./act";
import { cleanup } from "./cleanup";
import { isPaused } from "./pause";
import { reload } from "./reload";
import { save } from "./save";
import { measure } from "./tickTimer";

export function mainLoop() {
    initialize();

    if (isPaused()) {
        return;
    }
    cpuUsageEstimator.tickStart();

    if (global.tmpCache.debugFlag) {
        // tslint:disable-next-line:no-debugger
        debugger;
    }

    const colonies = reload();
    act(colonies);
    save(colonies);

    measure();
    cpuUsageEstimator.tickEnd();

    cleanup()
}

function initialize() {
    if (!Memory.battalions) {
        Memory.battalions = {};
    }
    if (!Memory.spawns) {
        Memory.spawns = {};
    }
    if (!Memory.creeps) {
        Memory.creeps = {};
    }
    if (!Memory.rooms) {
        Memory.rooms = {};
    }
    if (!Memory.roomPlans) {
        Memory.roomPlans = {};
    }
    for (const room in Game.rooms) {
        if (Game.rooms.hasOwnProperty(room)) {
            if (!Memory.rooms[room]) {
                Memory.rooms[room] = {
                    tasks: [],
                    idleTime: 0,
                    controllerLevel: 0,
                    towers: {},
                };
                Memory.roomPlans[room] = {
                    containers: { sinks: [], sources: [] },
                };
            }
            // TODO: remove after migration
            if (!Memory.rooms[room].towers) {
                Memory.rooms[room].towers = {};
            }
        }
    }
    if (!global.tmpCache) {
        global.tmpCache = { debugFlag: false };
    }
}
