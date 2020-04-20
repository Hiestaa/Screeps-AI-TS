// import { CreepAgent } from "agents/CreepAgent";
// import { HarvestNonStop } from "tasks/creep/Harvest";
// import { COLORS, getLogger } from "utils/Logger";
// import { BaseObjective } from "./IObjective";
// import { RoomAgent } from "agents/RoomAgent";

// const logger = getLogger("objectives.ContainersExtensionsRefill", COLORS.objectives);

// /**
//  * Creeps executing this objective will be sent to harvest continuously, each to a different source
//  */
// export class ContainersExtensionsRefill extends BaseObjective {
//     public name: ObjectiveType = "REFILL_CONT_EXT";

//     public execute(creepAgents: CreepAgent[]) {
//         logger.debug(`Executing ${this}`);
//         for (const creepAgent of creepAgents) {
//             if (!creepAgent.taskQueue.length) {
//                 creepAgent.scheduleTask(new HarvestNonStop());
//             }
//         }
//     }

//     public estimateRequiredWorkForce(room: RoomAgent): SpawnRequest[] {
//         return [{ count: 5, battalion: this.battalionId }];
//     }
// }
