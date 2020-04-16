import { IObjective } from "objectives/IObjective";
import { COLORS, getLogger } from "utils/Logger";
import { AGENT_STORE_LOCATIONS, IAgentStore } from "./IAgentStore";

const logger = getLogger("phases.act", COLORS.phases);

export function act(controllerStore: IAgentStore, objective: IObjective) {
    logger.debug(">>> ACT <<<");
    const newObjective = objective.execute(controllerStore);

    executeCreepControllers(controllerStore);
    executeSpawnControllers(controllerStore);

    return newObjective;
}

const executeCreepControllers = makeControllerExecute("creeps");
const executeSpawnControllers = makeControllerExecute("spawns");

function makeControllerExecute(storeLoc: AGENT_STORE_LOCATIONS) {
    return (controllerStore: IAgentStore) => {
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
