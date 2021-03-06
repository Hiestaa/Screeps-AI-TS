import { CreepAgent } from "agents/CreepAgent";
import { SpawnAgent } from "agents/SpawnAgent";
import { RoomPlanner } from "colony/RoomPlanner";
import { Build } from "tasks/creep/Build";
import { Fetch } from "tasks/creep/Fetch";
import { Harvest } from "tasks/creep/Harvest";
import { Haul } from "tasks/creep/Haul";
import { Repair } from "tasks/creep/Repair";
import { COLORS, getLogger } from "utils/Logger";
import { BaseObjective } from "./BaseObjective";

const logger = getLogger("objectives.ReachRCL2", COLORS.objectives);

export class ReachRCL2 extends BaseObjective {
    public name: ObjectiveType = "REACH_RCL2";

    public execute(creepAgents: CreepAgent[], roomPlanner: RoomPlanner, spawn: SpawnAgent) {
        for (const creepAgent of creepAgents) {
            logger.debug(`${this}: ensuring ${creepAgent} has all creep tasks scheduled`);
            if (!creepAgent.taskQueue.length) {
                // try to fetch something before going to harvest
                creepAgent.scheduleTask(new Fetch());
                const source = creepAgent.creepController?.creep.pos.findClosestByRange(FIND_SOURCES_ACTIVE);
                if (source) {
                    creepAgent.scheduleTask(new Harvest({ sourceId: source.id }));
                }
                creepAgent.scheduleTask(new Haul({ deliveryTargets: [STRUCTURE_SPAWN] }));
                creepAgent.scheduleTask(new Repair());
                creepAgent.scheduleTask(
                    new Build({ buildPriority: [STRUCTURE_EXTENSION, STRUCTURE_TOWER, STRUCTURE_RAMPART, STRUCTURE_TOWER] }),
                );
                creepAgent.scheduleTask(new Repair({ forced: true }));
                creepAgent.scheduleTask(new Haul({ deliveryTargets: [STRUCTURE_SPAWN, STRUCTURE_CONTROLLER, STRUCTURE_CONTAINER] }));
            }
        }
    }

    public estimateRequiredWorkForce(roomPlanner: RoomPlanner): SpawnRequest[] {
        return [{ count: 2, battalion: this.battalionId, creepProfile: "GeneralPurpose" }];
    }
}
