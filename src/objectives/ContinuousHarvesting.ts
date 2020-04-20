import { CreepAgent } from "agents/CreepAgent";
import { RoomAgent } from "agents/RoomAgent";
import { HarvestNonStop } from "tasks/creep/Harvest";
import { COLORS, getLogger } from "utils/Logger";
import { BaseObjective } from "./IObjective";

const logger = getLogger("objectives.ContinuousHarvesting", COLORS.objectives);

/**
 * Creeps executing this objective will be sent to harvest continuously, each to a different source
 * The number of mining spots available for each source is estimated and
 * the size of the workforce is based on that estimation.
 */
export class ContinuousHarvesting extends BaseObjective {
    public name: ObjectiveType = "CONTINUOUS_HARVESTING";
    // for caching and avoid recalculating
    // might be good to save in memory also?
    public miningSpotsPerSource: { [key: string]: number } = {};
    public totalMiningSpots = 0;

    public execute(creepAgents: CreepAgent[], room: RoomAgent) {
        logger.debug(`Executing ${this}`);
        const miningSpotsPerSource = this.getMiningSpotsPerSource(room);

        const sourceIds = Object.keys(miningSpotsPerSource);
        const creepPerSource: { [key: string]: number } = {};
        let i = 0;
        for (const creepAgent of creepAgents) {
            const sourceId = sourceIds[i];

            if (!creepAgent.taskQueue.length) {
                creepAgent.scheduleTask(new HarvestNonStop(sourceId));
                creepPerSource[sourceId] = (creepPerSource[sourceId] || 0) + 1;
            } else {
                const taskCount = creepAgent
                    .getScheduledTasks("TASK_HARVEST_NON_STOP")
                    .filter(task => (task as HarvestNonStop).sourceId).length;
                if (taskCount > 0) {
                    creepPerSource[sourceId] = (creepPerSource[sourceId] || 0) + 1;
                }
            }

            if (creepPerSource[sourceId] > miningSpotsPerSource[sourceId]) {
                i += 1;
            }

            if (i > sourceIds.length) {
                logger.warning(`Too many creeps for the number of sources`);
                break;
            }
        }
    }

    private getMiningSpotsPerSource(room: RoomAgent) {
        // TODO[OPTIMIZATION]: compute once and commit to memory
        if (this.totalMiningSpots) {
            // already computed
            return this.miningSpotsPerSource;
        }

        const sources = room.roomController?.room.find(FIND_SOURCES_ACTIVE);
        if (!sources) {
            return this.miningSpotsPerSource;
        }

        this.totalMiningSpots = 0;
        for (const source of sources) {
            this.miningSpotsPerSource[source.id] = this.getAvailableMiningSpots(room, source);
            this.totalMiningSpots += this.miningSpotsPerSource[source.id];
        }
        return this.miningSpotsPerSource;
    }

    private getAvailableMiningSpots(room: RoomAgent, source: Source) {
        if (this.miningSpotsPerSource[source.id]) {
            return this.miningSpotsPerSource[source.id];
        }
        this.miningSpotsPerSource[source.id] = this.estimateAvailableMiningSpots(room, source);
        return this.miningSpotsPerSource[source.id];
    }

    private estimateAvailableMiningSpots(room: RoomAgent, source: Source) {
        // TODO: when creeps are powerful enough, one will drain the source entirely by himself before the source replenishes
        const { pos } = source;
        const surroundings = room.roomController?.room.lookAtArea(pos.y - 1, pos.x - 1, pos.y + 1, pos.x + 1, true);
        if (!surroundings) {
            return 0;
        }

        const available: { [key: string]: boolean } = {};
        for (const item of surroundings) {
            const sign = `${item.x},${item.y}`;
            if (available[sign] === undefined && item.type === "terrain" && item.terrain !== "wall") {
                available[sign] = true;
            }
            if (item.type === "terrain" && item.terrain === "wall") {
                available[sign] = false;
            }
            // TODO: more type of unavailable items;
        }

        const spots = Object.keys(available).filter(k => available[k]).length;
        return Math.max(spots - 1, 0);
    }

    public estimateRequiredWorkForce(room: RoomAgent): SpawnRequest[] {
        this.getMiningSpotsPerSource(room);
        return [{ count: this.totalMiningSpots, battalion: this.battalionId }];
    }
}
