import { CreepAgent } from "agents/CreepAgent";
import { RoomAgent } from "agents/RoomAgent";
import { SpawnAgent } from "agents/SpawnAgent";
import { BaseObjective } from "objectives/IObjective";

/**
 * Base structure for agent stores (or agent managers?) operating in a given room.
 * ATM this is only a repository of agents collaborating to achieve an objective.
 * Later might be renamed to "colony" when the domain spans over multiple rooms.
 */
export interface IAgentStore {
    creeps: { [key: string]: CreepAgent };
    spawns: { [key: string]: SpawnAgent };
    room: RoomAgent;
    objective: BaseObjective;
}

export function initAgentStore(room: Room, objective: BaseObjective): IAgentStore {
    return {
        creeps: {},
        spawns: {},
        room: new RoomAgent(room.name),
        objective,
    };
}

export type AGENT_STORE_LOCATIONS = "creeps" | "spawns";

export interface IAgentStoreCollection {
    [key: string]: IAgentStore;
}
