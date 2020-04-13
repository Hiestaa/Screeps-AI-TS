import { IObjective } from "objectives/IObjective";
import { COLORS, getLogger } from "utils/Logger";
import { CONTROLLER_STORE_LOCATIONS, IControllerStore } from "./IControllerStore";

const logger = getLogger("phases.act", COLORS.phases);

export function act(controllerStore: IControllerStore, objective: IObjective) {
    logger.debug(">>> ACT <<<");
    const newObjective = objective.execute(controllerStore);

    executeCreepControllers(controllerStore);
    executeSpawnControllers(controllerStore);

    return newObjective;
}

const executeCreepControllers = makeControllerExecute("creeps");
const executeSpawnControllers = makeControllerExecute("spawns");

function makeControllerExecute(storeLoc: CONTROLLER_STORE_LOCATIONS) {
    return (controllerStore: IControllerStore) => {
        for (const controllerId in controllerStore[storeLoc]) {
            if (!controllerStore[storeLoc].hasOwnProperty(controllerId)) {
                continue;
            }
            const controller = controllerStore[storeLoc][controllerId];
            logger.debug(`Executing ${controller}`);
            controller.execute();
        }
    };
}
