import { CreepAgent } from "agents/CreepAgent";
import { SpawnAgent } from "agents/SpawnAgent";

export interface IAgentStore {
    creeps: { [key: string]: CreepAgent };
    spawns: { [key: string]: SpawnAgent };
}

export function initAgentStore(): IAgentStore {
    return {
        creeps: {},
        spawns: {},
    };
}

export type AGENT_STORE_LOCATIONS = "creeps" | "spawns";
