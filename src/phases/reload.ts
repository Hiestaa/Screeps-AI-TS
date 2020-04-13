import { CreepController } from "controllers/CreepController";
import { SpawnController } from "controllers/SpawnController";
import { IObjective, OBJECTIVE_TYPE } from "objectives/IObjective";
import { ReachRCL1 } from "objectives/ReachRCL1";
import { COLORS, getLogger } from "utils/Logger";
import { IControllerStore, initControllerStore } from "./IControllerStore";

const logger = getLogger("phases.reload", COLORS.phases);

/**
 * Reload phase of the loop
 * Re-instantiate all the game objects based on the current memory/game state.
 */
export function reload(): [IControllerStore, IObjective] {
    logger.debug(">>> RELOAD <<<");
    const controllerStore = initControllerStore();
    reloadCreeps(controllerStore);
    reloadSpawns(controllerStore);
    const objective = reloadObjective();
    return [controllerStore, objective];
}

const reloadCreeps = makeControllerReload("creeps");
const reloadSpawns = makeControllerReload("spawns");

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
type ReloadableController = IConstructable<CreepController> | IConstructable<SpawnController>;
type ReloadableObjective = IConstructable<ReachRCL1>;

type CONTROLLER_MEM_LOCS = "creeps" | "spawns";

function makeControllerReload(memLoc: CONTROLLER_MEM_LOCS) {
    const getController = (_memLoc: CONTROLLER_MEM_LOCS): ReloadableController => {
        switch (_memLoc) {
            case "creeps":
                return CreepController;
            case "spawns":
                return SpawnController;
        }
    };

    const Controller = getController(memLoc);

    return (controllerStore: IControllerStore) => {
        for (const name in Memory[memLoc]) {
            if (!Memory[memLoc].hasOwnProperty(name)) {
                continue;
            }

            const controller = new Controller(name);
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

            const controller = new Controller(name);
            controllerStore[memLoc][name] = controller;
            logger.debug(`Reloading ${controller} from Game`);
            controller.reload();
        }
    };
}
