import { CreepAgent } from "agents/CreepAgent";
import { RoomPlanner } from "colony/RoomPlanner";
import { Fetch } from "tasks/creep/Fetch";
import { Haul } from "tasks/creep/Haul";
import { COLORS, getLogger } from "utils/Logger";
import { BaseObjective } from "./BaseObjective";

const logger = getLogger("objectives.KeepContainersExtensionsFull", COLORS.objectives);

/**
 * Creeps executing this objective will be maintained on task to keep extensions (primarily)
 * and sink containers using energy fetched from source containers or dropped resources
 */
export class KeepContainersExtensionsFull extends BaseObjective {
    public name: ObjectiveType = "KEEP_CONT_EXT_FULL";

    public execute(creepAgents: CreepAgent[], room: RoomPlanner) {
        logger.debug(`Executing ${this}`);

        const sinks = room.roomPlan.plan.containers?.sinks || [];
        const sources = room.roomPlan.plan.containers?.sources || [];

        for (const creep of creepAgents) {
            if (creep.taskQueue.length > 0) {
                continue;
            }

            creep.scheduleTask(new Fetch(sinks)); // avoid sinks (but pink any suitable source)
            creep.scheduleTask(new Haul(["spawn", "extension", "container", "storage"], sources)); // avoid source (but pink any suitable sink)
        }
    }

    public estimateRequiredWorkForce(room: RoomPlanner): SpawnRequest[] {
        // TODO: make it a function of the number of buildings or construction sites?
        return [{ count: 4, battalion: this.battalionId, creepProfile: "Hauler" }];
    }
}
