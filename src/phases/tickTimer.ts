import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("phases.time", COLORS.phases);

export function measure() {
    if (Game.time % 1000 === 0) {
        query();
    }
    Memory.prevDuration = Date.now() - (Memory.prevNow || Date.now());
    Memory.prevNow = Date.now();
    Memory.prevDurations = Memory.prevDurations || [];
    Memory.prevDurations.push(Memory.prevDuration);
    if (Memory.prevDurations.length > 20) {
        Memory.prevDurations = Memory.prevDurations.slice(-20);
    }
}

export function query() {
    const avg = Memory.prevDurations.reduce((acc, v) => acc + v, 0) / Memory.prevDurations.length;
    logger.warning(`Tick duration: ${Memory.prevDuration}ms (average over 20 measurements: ${avg}ms)`);
}
