import { CreepAgent } from "agents/CreepAgent";
import { SpawnAgent } from "agents/SpawnAgent";
import { RoomPlanner } from "colony/RoomPlanner";
import { Build } from "tasks/creep/Build";
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
                const source = creepAgent.creepController?.creep.pos.findClosestByRange(FIND_SOURCES_ACTIVE);
                if (source) {
                    creepAgent.scheduleTask(new Harvest(source.id));
                }
                creepAgent.scheduleTask(new Haul([STRUCTURE_SPAWN]));
                creepAgent.scheduleTask(new Repair());
                creepAgent.scheduleTask(
                    new Build([STRUCTURE_EXTENSION, STRUCTURE_TOWER, STRUCTURE_RAMPART, STRUCTURE_TOWER]),
                );
                creepAgent.scheduleTask(new Repair());
                creepAgent.scheduleTask(new Haul([STRUCTURE_SPAWN, STRUCTURE_CONTROLLER, STRUCTURE_CONTAINER]));
            }
        }
    }

    public estimateRequiredWorkForce(roomPlanner: RoomPlanner): SpawnRequest[] {
        return [{ count: 2, battalion: this.battalionId, creepProfile: "GeneralPurpose" }];
    }
}
