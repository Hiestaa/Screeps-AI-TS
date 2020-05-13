import { CreepAgent } from "agents/CreepAgent";
import { RoomPlanner } from "colony/RoomPlanner";
import { Fetch } from "tasks/creep/Fetch";
import { Haul } from "tasks/creep/Haul";
import { COLORS, getLogger } from "utils/Logger";
import { BaseObjective } from "./BaseObjective";

const logger = getLogger("objectives.EnergyHauling", COLORS.objectives);

/**
 * Keep (sink) containers refilled with energy fetched from any available target.
 * Creeps executing this objective are designed to remain out of the spawn area as much as possible to avoid clutter,
 * by just hauling energy to its container/storage
 */
export class RefillContainers extends BaseObjective {
    public name: ObjectiveType = "REFILL_CONTAINERS";

    public execute(creepAgents: CreepAgent[], room: RoomPlanner) {
        logger.debug(`Executing ${this}`);

        const sinks = room.roomPlan.plan.containers?.sinks || [];
        const sources = room.roomPlan.plan.containers?.sources || [];

        for (const creep of creepAgents) {
            if (creep.taskQueue.length > 0) {
                continue;
            }

            creep.scheduleTask(new Fetch([], sinks)); // avoid sinks (but pick any suitable source)
            // note: won't fill up the storage if containers aren't full, there is a cap when it's not the last item
            creep.scheduleTask(new Haul(["storage", "container", "storage"], sources)); // avoid source (but pink any suitable sink)
        }
    }

    public estimateRequiredWorkForce(room: RoomPlanner): SpawnRequest[] {
        // TODO: make it a function of the number of buildings or construction sites?
        return [{ count: 3, battalion: this.battalionId, creepProfile: "Hauler" }];
    }
}

/**
 * Keep spawn, extensions and other spawn structure refilled with energy fetched primarily from the spawn container/storage
 * Creeps executing this objective are designed to remain with the spawn area to be as efficient as possible with energy hauling
 */
export class RefillSpawnStorage extends BaseObjective {
    public name: ObjectiveType = "REFILL_SPAWN_STORAGE";

    public execute(creepAgents: CreepAgent[], room: RoomPlanner) {
        logger.debug(`Executing ${this}`);

        const spawn = room.roomPlan.plan.containers?.spawn;
        if (!spawn && Game.time % 10 === 0) {
            logger.info(`No spawn container/storage to fetch from.`);
        }

        for (const creep of creepAgents) {
            if (creep.taskQueue.length > 0) {
                continue;
            }

            creep.scheduleTask(new Fetch([STRUCTURE_STORAGE, STRUCTURE_CONTAINER]));
            creep.scheduleTask(new Haul([STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER]));
        }
    }

    public estimateRequiredWorkForce(room: RoomPlanner): SpawnRequest[] {
        return [{ count: 2, battalion: this.battalionId, creepProfile: "Hauler" }];
    }
}
