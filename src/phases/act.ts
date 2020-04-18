import { nextObjectiveInRoom } from "objectives/transition";
import { COLORS, getLogger } from "utils/Logger";
import { AGENT_STORE_LOCATIONS, IAgentStore, IAgentStoreCollection } from "./IAgentStore";

const logger = getLogger("phases.act", COLORS.phases);

export function act(agentStoreCollection: IAgentStoreCollection) {
    logger.debug(">>> ACT <<<");
    for (const roomName in agentStoreCollection) {
        if (agentStoreCollection.hasOwnProperty(roomName)) {
            const agentStore = agentStoreCollection[roomName];

            const objective = agentStore.objective;
            objective.execute(agentStore);
            agentStore.objective = nextObjectiveInRoom(agentStore.objective.name, agentStore.room);
            executeCreepControllers(agentStore);
            executeSpawnControllers(agentStore);
            agentStore.room.execute();
        }
    }
}

const executeCreepControllers = makeControllerExecute("creeps");
const executeSpawnControllers = makeControllerExecute("spawns");

function makeControllerExecute(storeLoc: AGENT_STORE_LOCATIONS) {
    return (agentStore: IAgentStore) => {
        for (const agentId in agentStore[storeLoc]) {
            if (!agentStore[storeLoc].hasOwnProperty(agentId)) {
                continue;
            }
            const agent = agentStore[storeLoc][agentId];
            logger.debug(`Executing ${agent}`);
            agent.execute();
        }
    };
}
