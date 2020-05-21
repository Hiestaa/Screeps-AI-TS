import { CreepAgent } from "agents/CreepAgent";
import { RoomPlanner } from "colony/RoomPlanner";
import { Build } from "tasks/creep/Build";
import { Fetch } from "tasks/creep/Fetch";
import { Haul } from "tasks/creep/Haul";
import { Repair } from "tasks/creep/Repair";
import { UpgradeController } from "tasks/creep/UpgradeController";
import { COLORS, getLogger } from "utils/Logger";
import { BaseObjective } from "./BaseObjective";
import { CONTROLLER_DOWNGRADE_TIMER_LEVEL } from "./ReachRCL3";

const logger = getLogger("objectives.MaintainBuildings", COLORS.objectives);

/**
 * Maintain buildings in good shape and build new construction sites.
 * Also upgrade controller on space time
 */
export class MaintainBuildings extends BaseObjective {
    public name: ObjectiveType = "MAINTAIN_BUILDINGS";

    public execute(creepAgents: CreepAgent[], room: RoomPlanner) {
        logger.debug(`Executing ${this}`);
        for (const creep of creepAgents) {
            if (creep.taskQueue.length > 0) {
                continue;
            }

            creep.scheduleTask(new Fetch());
            this.assignUpgradeControllerIfNecessary(creep);
            creep.scheduleTask(new Repair());
            creep.scheduleTask(
                new Build([
                    STRUCTURE_EXTENSION,
                    STRUCTURE_TOWER,
                    STRUCTURE_STORAGE,
                    STRUCTURE_RAMPART,
                    STRUCTURE_CONTAINER,
                ]),
            );
            creep.scheduleTask(new Repair(true));
            creep.scheduleTask(new UpgradeController());
        }
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

    public estimateRequiredWorkForce(room: RoomPlanner): SpawnRequest[] {
        const level = room.room.roomController?.room.controller?.level;
        // TODO: make it a function of the number of containers and extensions?
        const perLevel: { [key: number]: number } = {
            1: 3,
            2: 6,
            3: 8,
            4: 10,
            5: 10,
            6: 10,
            7: 10,
            8: 10,
        };
        const count = perLevel[level || 1] || 1;
        return [{ count, battalion: this.battalionId, creepProfile: "Worker" }];
    }
}
