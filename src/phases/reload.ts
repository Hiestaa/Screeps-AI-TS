import { CreepAgent } from "agents/CreepAgent";
import { SpawnAgent } from "agents/SpawnAgent";
import { IObjective, OBJECTIVE_TYPE } from "objectives/IObjective";
import { ReachRCL1 } from "objectives/ReachRCL1";
import { COLORS, getLogger } from "utils/Logger";
import { IAgentStore, initAgentStore } from "./IAgentStore";

const logger = getLogger("phases.reload", COLORS.phases);

/**
 * Reload phase of the loop
 * Re-instantiate all the game objects based on the current memory/game state.
 */
export function reload(): [IAgentStore, IObjective] {
    logger.debug(">>> RELOAD <<<");
    const controllerStore = initAgentStore();
    reloadCreeps(controllerStore);
    reloadSpawns(controllerStore);
    const objective = reloadObjective();
    return [controllerStore, objective];
}

const reloadCreeps = makeAgentReload("creeps");
const reloadSpawns = makeAgentReload("spawns");

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
type ReloadableAgent = IConstructable<CreepAgent> | IConstructable<SpawnAgent>;
type ReloadableObjective = IConstructable<ReachRCL1>;

type TASK_EXECUTOR_MEM_LOCS = "creeps" | "spawns";

function makeAgentReload(memLoc: TASK_EXECUTOR_MEM_LOCS) {
    const getAgentClass = (_memLoc: TASK_EXECUTOR_MEM_LOCS): ReloadableAgent => {
        switch (_memLoc) {
            case "creeps":
                return CreepAgent;
            case "spawns":
                return SpawnAgent;
        }
    };

    const Agent = getAgentClass(memLoc);

    return (controllerStore: IAgentStore) => {
        for (const name in Memory[memLoc]) {
            if (!Memory[memLoc].hasOwnProperty(name)) {
                continue;
            }

            const controller = new Agent(name);
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

            const controller = new Agent(name);
            controllerStore[memLoc][name] = controller;
            logger.debug(`Reloading ${controller} from Game`);
            controller.reload();
        }
    };
}
