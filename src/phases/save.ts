import { IObjective } from "objectives/IObjective";
import { COLORS, getLogger } from "utils/Logger";
import { CONTROLLER_STORE_LOCATIONS, IControllerStore } from "./IControllerStore";

const logger = getLogger("phases.save", COLORS.phases);

export function save(controllerStore: IControllerStore, objective: IObjective) {
    logger.debug(">>> SAVE <<<");
    saveCreepControllers(controllerStore);
    saveSpawnControllers(controllerStore);
    objective.save();
}

const saveCreepControllers = makeControllerSave("creeps");
const saveSpawnControllers = makeControllerSave("spawns");

function makeControllerSave(storeLoc: CONTROLLER_STORE_LOCATIONS) {
    return (controllerStore: IControllerStore) => {
        for (const key in controllerStore[storeLoc]) {
            if (!controllerStore[storeLoc].hasOwnProperty(key)) {
                continue;
            }

            const controller = controllerStore[storeLoc][key];
            logger.debug(`Saving ${controller}`);
            controller.save();
        }
    };
}
