import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("phases.pause", COLORS.phases);

Memory.paused = Memory.paused || 0;
const INFINITY_ISH = 10000000;

export function pause(duration?: number) {
    Memory.paused = Game.time + (duration || INFINITY_ISH);
    logger.warning(`AI paused for ${duration || INFINITY_ISH}`);
}

export function resume() {
    logger.warning(`Resuming AI execution`);
    Memory.paused = Game.time;
}

export function isPaused() {
    if (Game.time === Memory.paused) {
        logger.warning(`Execution resumed`);
    }
    return Game.time < Memory.paused;
}
