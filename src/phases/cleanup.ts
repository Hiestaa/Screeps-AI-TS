import { createTaskInstance } from "agents/CreepAgent";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger('phases.cleanup', COLORS.phases)

/**
 * Automatically delete memory of missing creeps
 * TODO: if tower or spawn get destroyed we probably want to react and cleanup memory of these as well.
 */
export function cleanup() {
    for (const name in Memory.creeps) {
        if (!(name in Game.creeps)) {
            cleanupCreep(name, Memory.creeps[name])
        }
    }
}


function cleanupCreep(name: string, memory: CreepMemory) {
    logger.warning(`Notifying creep death: ${name}`);
    if (memory.tasks && memory.tasks.length > 0) {
        const currentTask = memory.tasks[0];
        if (currentTask.executionStarted) {
            const task = createTaskInstance(currentTask);
            task.onInterrupt(name);
        }
    }
    delete Memory.creeps[name];
}
