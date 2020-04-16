import { IObjective } from "objectives/IObjective";
import { COLORS, getLogger } from "utils/Logger";
import { AGENT_STORE_LOCATIONS, IAgentStore } from "./IAgentStore";

const logger = getLogger("phases.save", COLORS.phases);

export function save(controllerStore: IAgentStore, objective: IObjective) {
    logger.debug(">>> SAVE <<<");
    saveCreepControllers(controllerStore);
    saveSpawnControllers(controllerStore);
    objective.save();
}

const saveCreepControllers = makeControllerSave("creeps");
const saveSpawnControllers = makeControllerSave("spawns");

function makeControllerSave(storeLoc: AGENT_STORE_LOCATIONS) {
    return (controllerStore: IAgentStore) => {
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
