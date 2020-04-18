import { RoomAgent } from "agents/RoomAgent";
import { SpawnAgent } from "agents/SpawnAgent";
import { IAgentStore } from "phases/IAgentStore";
import { PlaceConstructionSites } from "tasks/PlaceConstructionSites";
import { COLORS, getLogger } from "utils/Logger";
import { ReachRCL2 } from "./ReachRCL2";

const logger = getLogger("objectives.ReachRCL3", COLORS.objectives);

export class ReachRCL3 extends ReachRCL2 {
    public name: ObjectiveType = "REACH_RCL3";

    public execute(agentStore: IAgentStore) {
        super.execute(agentStore);

        this.assignRoomTasks(
            agentStore.room,
            Object.keys(agentStore.spawns).map(k => agentStore.spawns[k]),
        );

        return this;
    }

    private assignRoomTasks(roomAgent: RoomAgent, spawnAgents: SpawnAgent[]) {
        logger.debug(`${this}: ensuring ${roomAgent} has task TASK_PLACE_CONSTRUCTION_SITES scheduled`);

        if (!roomAgent.hasTaskScheduled("TASK_PLACE_CONSTRUCTION_SITES")) {
            spawnAgents.forEach(s => {
                if (s.spawnController) {
                    roomAgent.scheduleTask(new PlaceConstructionSites(s.spawnController.spawn.pos));
                }
            });
        }
    }
}
