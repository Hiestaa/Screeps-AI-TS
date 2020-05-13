import { CreepAgent } from "agents/CreepAgent";
import { RoomPlanner } from "colony/RoomPlanner";
import { HarvestNonStop } from "tasks/creep/Harvest";
import { COLORS, getLogger } from "utils/Logger";
import { SOLO_HARVEST_PAST_RCL } from "../constants";
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

    constructor(battalionId: keyof ColonyBattalionsMemory, miningSpotsPerSource: { [key: string]: number }) {
        super(battalionId);
        this.miningSpotsPerSource = miningSpotsPerSource;
        this.totalMiningSpots = 0;
        for (const sourceId in miningSpotsPerSource) {
            if (miningSpotsPerSource.hasOwnProperty(sourceId)) {
                if (miningSpotsPerSource[sourceId] === 1) {
                    this.totalMiningSpots += 1;
                } else {
                    // Do not request for exactly as many creeps as mining spots as it would account to unreasonable number of harvesters
                    this.totalMiningSpots += Math.max(0, miningSpotsPerSource[sourceId] - 1);
                }
            }
        }
    }

    public execute(creepAgents: CreepAgent[], roomPlanner: RoomPlanner) {
        logger.debug(`Executing ${this}`);
        if (this.totalMiningSpots === 0) {
            logger.warning(`${this}: no safe source to harvest from.`);
            return;
        }

        const { creepsPerSource, availableCreeps } = this.filterAvailableCreeps(creepAgents);

        this.dispatchAvailableCreeps(creepsPerSource, availableCreeps, roomPlanner);
    }

    public filterAvailableCreeps(creepAgents: CreepAgent[]) {
        const creepsPerSource: { [key: string]: number } = {};
        const availableCreeps = [];
        for (const creepAgent of creepAgents) {
            const tasks = creepAgent.getScheduledTasks("TASK_HARVEST_NON_STOP");
            if (tasks.length > 0) {
                const hns = tasks[0] as HarvestNonStop;
                creepsPerSource[hns.sourceId] = (creepsPerSource[hns.sourceId] || 0) + 1;
            } else {
                availableCreeps.push(creepAgent);
            }
        }

        return { creepsPerSource, availableCreeps };
    }

    public dispatchAvailableCreeps(
        creepsPerSource: { [key: string]: number },
        availableCreeps: CreepAgent[],
        roomPlanner: RoomPlanner,
    ) {
        const soloHarvest = roomPlanner.reachedRCL(SOLO_HARVEST_PAST_RCL);

        const sourceIds = Object.keys(this.miningSpotsPerSource).filter(k => this.miningSpotsPerSource[k] > 0);
        if (sourceIds.length === 0) {
            logger.warning(`${this}: no safe source to harvest from`);
            return;
        }
        let i = 0;

        for (const creepAgent of availableCreeps) {
            let foundAvailableSource = false;
            for (const sourceId of sourceIds) {
                const creepsCountForCurrentSource = creepsPerSource[sourceId] || 0;
                const miningSpotsAtSource = soloHarvest ? 1 : this.miningSpotsPerSource[sourceId];

                if (creepsCountForCurrentSource < miningSpotsAtSource) {
                    creepAgent.scheduleTask(this.makeHarvestTask(sourceId, soloHarvest, roomPlanner));
                    creepsPerSource[sourceId] = creepsCountForCurrentSource + 1;
                    foundAvailableSource = true;
                    break;
                }
            }

            if (!foundAvailableSource) {
                // couldn't find a source with available spots for this creep - assign source i and increment i
                if (i === 0) {
                    logger.warning(`Too many creeps for the number of sources`);
                }

                creepAgent.scheduleTask(this.makeHarvestTask(sourceIds[i], soloHarvest, roomPlanner));

                i += 1;
                if (i >= sourceIds.length) {
                    i = 0;
                }
            }
        }
    }

    private makeHarvestTask(sourceId: string, soloHarvest: boolean, roomPlanner: RoomPlanner) {
        if (soloHarvest) {
            const fromPos = roomPlanner.roomPlan.getContainerPositionForSource(sourceId);
            return new HarvestNonStop(sourceId, fromPos);
        }
        return new HarvestNonStop(sourceId);
    }

    public estimateRequiredWorkForce(roomPlanner: RoomPlanner): SpawnRequest[] {
        let count = 0;

        if (roomPlanner.reachedRCL(SOLO_HARVEST_PAST_RCL)) {
            // past level 4, only 1 creep is enough per source to bring it to depletion before refill
            count = Object.keys(this.miningSpotsPerSource).filter(sId => this.miningSpotsPerSource[sId] > 0).length;
        } else {
            count = this.totalMiningSpots;
        }

        return [{ count, battalion: this.battalionId, creepProfile: "Harvester" }];
    }

    public save(): ContinuousHarvestingMemory {
        const json = super.save();
        return { miningSpotsPerSource: this.miningSpotsPerSource, ...json };
    }
}
