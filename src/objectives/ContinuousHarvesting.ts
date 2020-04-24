import { CreepAgent } from "agents/CreepAgent";
import { HarvestNonStop } from "tasks/creep/Harvest";
import { COLORS, getLogger } from "utils/Logger";
import { BaseObjective } from "./BaseObjective";

const logger = getLogger("objectives.ContinuousHarvesting", COLORS.objectives);

/**
 * Creeps executing this objective will be sent to harvest continuously, each to a different source
 * The number of mining spots available for each source is estimated and
 * the size of the workforce is based on that estimation.
 */
export class ContinuousHarvesting extends BaseObjective {
    public name: ObjectiveType = "CONTINUOUS_HARVESTING";
    public miningSpotsPerSource: { [key: string]: number };
    public totalMiningSpots = 0;

    constructor(battalionId: string, miningSpotsPerSource: { [key: string]: number }) {
        super(battalionId);
        this.miningSpotsPerSource = miningSpotsPerSource;
        this.totalMiningSpots = 0;
        for (const sourceId in miningSpotsPerSource) {
            if (miningSpotsPerSource.hasOwnProperty(sourceId)) {
                this.totalMiningSpots += miningSpotsPerSource[sourceId];
            }
        }
    }

    public execute(creepAgents: CreepAgent[]) {
        logger.debug(`Executing ${this}`);

        const sourceIds = Object.keys(this.miningSpotsPerSource).filter(k => this.miningSpotsPerSource[k] > 0);
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
                    .filter(task => (task as HarvestNonStop).sourceId === sourceId).length;
                if (taskCount > 0) {
                    creepPerSource[sourceId] = (creepPerSource[sourceId] || 0) + 1;
                } else {
                    creepAgent.replaceTask(new HarvestNonStop(sourceId));
                }
            }

            if (creepPerSource[sourceId] >= this.miningSpotsPerSource[sourceId]) {
                i += 1;
            }

            if (i > sourceIds.length) {
                logger.warning(`Too many creeps for the number of sources`);
                break;
            }
        }
    }

    public estimateRequiredWorkForce(): SpawnRequest[] {
        return [
            { count: Math.max(0, this.totalMiningSpots - 2), battalion: this.battalionId, creepProfile: "Harvester" },
        ];
    }

    public save(): ContinuousHarvestingMemory {
        const json = super.save();
        return { miningSpotsPerSource: this.miningSpotsPerSource, ...json };
    }
}
