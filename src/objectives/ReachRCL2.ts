import { CreepAgent } from "agents/CreepAgent";
import { Build } from "tasks/creep/Build";
import { Harvest } from "tasks/creep/Harvest";
import { Haul } from "tasks/creep/Haul";
import { COLORS, getLogger } from "utils/Logger";
import { BaseObjective } from "./IObjective";

const logger = getLogger("objectives.ReachRCL2", COLORS.objectives);

export class ReachRCL2 extends BaseObjective {
    public name: ObjectiveType = "REACH_RCL2";

    public execute(creepAgents: CreepAgent[]) {
        for (const creepAgent of creepAgents) {
            logger.debug(`${this}: ensuring ${creepAgent} has all creep tasks scheduled`);
            if (!creepAgent.taskQueue.length) {
                creepAgent.scheduleTask(new Harvest());
                creepAgent.scheduleTask(new Haul([STRUCTURE_SPAWN]));
                creepAgent.scheduleTask(
                    new Build([STRUCTURE_EXTENSION, STRUCTURE_TOWER, STRUCTURE_RAMPART, STRUCTURE_TOWER]),
                );
                creepAgent.scheduleTask(new Haul([STRUCTURE_SPAWN, STRUCTURE_CONTROLLER, STRUCTURE_CONTAINER]));
            }
        }
    }
}
