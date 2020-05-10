import { CreepAgent } from "agents/CreepAgent";
import { RoomPlanner } from "colony/RoomPlanner";
import { HarvestNonStop } from "tasks/creep/Harvest";
import { COLORS, getLogger } from "utils/Logger";
import { BaseObjective } from "./BaseObjective";

const logger = getLogger("objectives.ContinuousHarvesting", COLORS.objectives);

const SOLO_HARVEST_PAST_RCL = 4;

/**
 * Creeps executing this objective will be sent to harvest continuously, each to a different source
 * The number of mining spots available for each source is estimated and
 * the size of the workforce is based on that estimation.
 */
export class ContinuousHarvesting extends BaseObjective {
    public name: ObjectiveType = "CONTINUOUS_HARVESTING";
    public miningSpotsPerSource: { [key: string]: number };
    public totalMiningSpots = 0;

    constructor(battalionId: keyof ColonyBattalionsMemory, miningSpotsPerSource: { [key: string]: number }) {
        super(battalionId);
        this.miningSpotsPerSource = miningSpotsPerSource;
        this.totalMiningSpots = 0;
        for (const sourceId in miningSpotsPerSource) {
            if (miningSpotsPerSource.hasOwnProperty(sourceId)) {
                this.totalMiningSpots += miningSpotsPerSource[sourceId];
            }
        }
    }

    public execute(creepAgents: CreepAgent[], roomPlanner: RoomPlanner) {
        logger.debug(`Executing ${this}`);
        const controllerLevel = roomPlanner.room.roomController?.room.controller?.level;

        const sourceIds = Object.keys(this.miningSpotsPerSource).filter(k => this.miningSpotsPerSource[k] > 0);
        const creepPerSource: { [key: string]: number } = {};
        let i = 0;
        for (const creepAgent of creepAgents) {
            const sourceId = sourceIds[i];
            const soloHarvest =
                controllerLevel && controllerLevel >= SOLO_HARVEST_PAST_RCL && (creepPerSource[sourceId] || 0) === 0;

            let harvestTask: HarvestNonStop;
            if (soloHarvest) {
                const harvestFromPos = roomPlanner.roomPlan.getContainerPositionForSource(sourceId);
                harvestTask = new HarvestNonStop(sourceId, harvestFromPos);
            } else {
                harvestTask = new HarvestNonStop(sourceId);
            }

            if (!creepAgent.taskQueue.length) {
                creepAgent.scheduleTask(harvestTask);
                creepPerSource[sourceId] = (creepPerSource[sourceId] || 0) + 1;
            } else {
                const taskCount = creepAgent
                    .getScheduledTasks("TASK_HARVEST_NON_STOP")
                    .filter(task => (task as HarvestNonStop).sourceId === sourceId).length;
                if (taskCount > 0) {
                    creepPerSource[sourceId] = (creepPerSource[sourceId] || 0) + 1;
                } else {
                    creepAgent.replaceTask(harvestTask);
                }
            }

            if (soloHarvest || creepPerSource[sourceId] >= this.miningSpotsPerSource[sourceId]) {
                i += 1;
            }

            if (i > sourceIds.length) {
                if (Game.time % 10 === 0) {
                    logger.warning(`Too many creeps for the number of sources`);
                }
                break;
            }
        }
    }

    public estimateRequiredWorkForce(roomPlanner: RoomPlanner): SpawnRequest[] {
        let count = 0;

        const controllerLevel = roomPlanner.room.roomController?.room.controller?.level;
        if (controllerLevel && controllerLevel >= SOLO_HARVEST_PAST_RCL) {
            // past level 4, only 1 creep is enough per source to bring it to depletion before refill
            count = Object.keys(this.miningSpotsPerSource).filter(sId => this.miningSpotsPerSource[sId] > 0).length;
        } else {
            count = Math.max(0, this.totalMiningSpots - 2);
        }

        return [{ count, battalion: this.battalionId, creepProfile: "Harvester" }];
    }

    public save(): ContinuousHarvestingMemory {
        const json = super.save();
        return { miningSpotsPerSource: this.miningSpotsPerSource, ...json };
    }
}
