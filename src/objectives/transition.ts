import { RoomAgent } from "agents/RoomAgent";
import { COLORS, getLogger } from "utils/Logger";
import { BaseObjective, IdleObjective } from "./IObjective";
import { ReachRCL2 } from "./ReachRCL2";
import { ReachRCL3 } from "./ReachRCL3";

const logger = getLogger("objectives.transition", COLORS.objectives);

export function nextObjectiveInRoom(currentObjective: ObjectiveType, roomAgent: RoomAgent): BaseObjective {
    const { roomController } = roomAgent;
    if (!roomController) {
        logger.warning("No room controller for room agent: " + roomAgent.name);
        return new IdleObjective(roomAgent.name);
    }
    const { controller } = roomController.room;
    if (!controller) {
        logger.warning("No controller in room: " + roomAgent.name);
        return new IdleObjective(roomAgent.name);
    }

    if (controller.level <= 1) {
        if (currentObjective !== "REACH_RCL2") {
            logger.warning("Controller still at level 1. ");
        }
        return new ReachRCL2(roomAgent.name);
    }

    if (currentObjective !== "REACH_RCL3") {
        logger.warning("Controller level 2 reached. Replacing objective with REACH_RCL3");
    }
    return new ReachRCL3(roomAgent.name);
}
