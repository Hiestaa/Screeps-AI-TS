import { act } from "./act";
import { isPaused } from "./pause";
import { reload } from "./reload";
import { save } from "./save";
import { measure } from "./tickTimer";

export function mainLoop() {
    if (isPaused()) {
        return;
    }

    initialize();
    const colonies = reload();
    act(colonies);
    save(colonies);

    measure();
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
                };
                Memory.roomPlans[room] = {
                    containers: { sinks: [], sources: [] },
                };
            }
        }
    }
}
