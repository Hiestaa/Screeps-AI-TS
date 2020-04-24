import { CreepAgent } from "agents/CreepAgent";
import { Build } from "tasks/creep/Build";
import { Fetch } from "tasks/creep/Fetch";
import { Haul } from "tasks/creep/Haul";
import { COLORS, getLogger } from "utils/Logger";
import { ReachRCL2 } from "./ReachRCL2";

const logger = getLogger("objectives.ReachRCL3", COLORS.objectives);

export const CONTROLLER_DOWNGRADE_TIMER_LEVEL: { [key: number]: number } = {
    1: 20000,
    2: 10000,
    3: 20000,
    4: 40000,
    5: 80000,
    6: 120000,
    7: 150000,
    8: 200000,
};

export class ReachRCL3 extends ReachRCL2 {
    public name: ObjectiveType = "REACH_RCL3";

    public execute(creepAgents: CreepAgent[]) {
        for (const creepAgent of creepAgents) {
            logger.debug(`${this}: ensuring ${creepAgent} has all creep tasks scheduled`);
            if (!creepAgent.taskQueue.length) {
                creepAgent.scheduleTask(new Fetch());
                this.assignUpgradeControllerIfNecessary(creepAgent);
                creepAgent.scheduleTask(new Haul([STRUCTURE_SPAWN, STRUCTURE_EXTENSION]));
                creepAgent.scheduleTask(
                    new Build([STRUCTURE_EXTENSION, STRUCTURE_TOWER, STRUCTURE_RAMPART, STRUCTURE_CONTAINER]),
                );
                creepAgent.scheduleTask(
                    new Haul([STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_CONTROLLER, STRUCTURE_CONTAINER]),
                );
            }
        }

        return this;
    }

    private assignUpgradeControllerIfNecessary(creepAgent: CreepAgent) {
        const roomController = _.get<StructureController>(creepAgent, "creepController.creep.room.controller");
        if (roomController) {
            const fullDowngradeTimer = CONTROLLER_DOWNGRADE_TIMER_LEVEL[roomController.level];
            if (fullDowngradeTimer && roomController.ticksToDowngrade < fullDowngradeTimer * 0.8) {
                creepAgent.scheduleTask(new Haul([STRUCTURE_CONTROLLER]));
            }
        }
    }

    public estimateRequiredWorkForce(): SpawnRequest[] {
        // TODO: this should be a 0 - at this point we should transition to dedicated battalion instead of general purpose creeps
        return [{ count: 1, battalion: this.battalionId, creepProfile: "GeneralPurpose" }];
    }
}
