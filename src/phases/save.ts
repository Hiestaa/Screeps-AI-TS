import { COLORS, getLogger } from "utils/Logger";
import { AGENT_STORE_LOCATIONS, IAgentStore, IAgentStoreCollection } from "./IAgentStore";

const logger = getLogger("phases.save", COLORS.phases);

export function save(agentStoreCollection: IAgentStoreCollection) {
    logger.debug(">>> SAVE <<<");
    for (const roomName in agentStoreCollection) {
        if (agentStoreCollection.hasOwnProperty(roomName)) {
            const agentStore = agentStoreCollection[roomName];
            saveCreepControllers(agentStore);
            saveSpawnControllers(agentStore);
            agentStore.room.save();
            agentStore.objective.save();
        }
    }
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
