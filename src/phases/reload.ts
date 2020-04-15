import { CreepTaskExecutor } from "controllers/taskExecutors/CreepTaskExecutor";
import { SpawnTaskExecutor } from "controllers/taskExecutors/SpawnTaskExecutor";
import { IObjective, OBJECTIVE_TYPE } from "objectives/IObjective";
import { ReachRCL1 } from "objectives/ReachRCL1";
import { COLORS, getLogger } from "utils/Logger";
import { initTaskExecutorStore, ITaskExecutorStore } from "./ITaskExecutorStore";

const logger = getLogger("phases.reload", COLORS.phases);

/**
 * Reload phase of the loop
 * Re-instantiate all the game objects based on the current memory/game state.
 */
export function reload(): [ITaskExecutorStore, IObjective] {
    logger.debug(">>> RELOAD <<<");
    const controllerStore = initTaskExecutorStore();
    reloadCreeps(controllerStore);
    reloadSpawns(controllerStore);
    const objective = reloadObjective();
    return [controllerStore, objective];
}

const reloadCreeps = makeTaskExecutorReload("creeps");
const reloadSpawns = makeTaskExecutorReload("spawns");

function reloadObjective(): IObjective {
    const getObjectiveClass = (objectiveType: OBJECTIVE_TYPE): ReloadableObjective => {
        switch (objectiveType) {
            case "REACH_RCL1":
                return ReachRCL1;
        }
    };

    const Objective = getObjectiveClass(Memory.objective.name);

    const objective = new Objective();
    logger.debug(`Reloading ${objective}`);
    objective.reload();
    return objective;
}

type IConstructable<T> = new (...args: any) => T;
type ReloadableTaskExecutor = IConstructable<CreepTaskExecutor> | IConstructable<SpawnTaskExecutor>;
type ReloadableObjective = IConstructable<ReachRCL1>;

type TASK_EXECUTOR_MEM_LOCS = "creeps" | "spawns";

function makeTaskExecutorReload(memLoc: TASK_EXECUTOR_MEM_LOCS) {
    const getTaskExecutor = (_memLoc: TASK_EXECUTOR_MEM_LOCS): ReloadableTaskExecutor => {
        switch (_memLoc) {
            case "creeps":
                return CreepTaskExecutor;
            case "spawns":
                return SpawnTaskExecutor;
        }
    };

    const TaskExecutor = getTaskExecutor(memLoc);

    return (controllerStore: ITaskExecutorStore) => {
        for (const name in Memory[memLoc]) {
            if (!Memory[memLoc].hasOwnProperty(name)) {
                continue;
            }

            const controller = new TaskExecutor(name);
            controllerStore[memLoc][name] = controller;
            logger.debug(`Reloading ${controller} from Memory`);
            controller.reload();
        }

        for (const name in Game[memLoc]) {
            if (!Game[memLoc].hasOwnProperty(name)) {
                continue;
            }
            if (controllerStore[memLoc][name]) {
                continue;
            }

            const controller = new TaskExecutor(name);
            controllerStore[memLoc][name] = controller;
            logger.debug(`Reloading ${controller} from Game`);
            controller.reload();
        }
    };
}
