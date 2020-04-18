import { CreepAgent } from "agents/CreepAgent";
import { SpawnAgent } from "agents/SpawnAgent";
import { BaseObjective, IdleObjective } from "objectives/IObjective";
import { ReachRCL2 } from "objectives/ReachRCL2";
import { ReachRCL3 } from "objectives/ReachRCL3";
import { COLORS, getLogger } from "utils/Logger";
import { IAgentStore, IAgentStoreCollection, initAgentStore } from "./IAgentStore";

const logger = getLogger("phases.reload", COLORS.phases);

/**
 * Reload phase of the loop
 * Re-instantiate all the game objects based on the current memory/game state.
 */
export function reload(): IAgentStoreCollection {
    logger.debug(">>> RELOAD <<<");
    const storesPerRoom: IAgentStoreCollection = {};
    for (const roomName in Game.rooms) {
        if (!Game.rooms.hasOwnProperty(roomName)) {
            continue;
        }
        const room = Game.rooms[roomName];
        const objective = reloadObjective(room.name);
        const agentStore = initAgentStore(room, objective);
        reloadCreeps(agentStore, room.name);
        reloadSpawns(agentStore, room.name);
        agentStore.room.reload();
        storesPerRoom[room.name] = agentStore;
    }
    return storesPerRoom;
}

const reloadCreeps = makeAgentReload("creeps");
const reloadSpawns = makeAgentReload("spawns");

function reloadObjective(roomName: string): BaseObjective {
    const getObjectiveClass = (objectiveType: ObjectiveType): ReloadableObjective => {
        switch (objectiveType) {
            case "REACH_RCL2":
                return ReachRCL2;
            case "REACH_RCL3":
                return ReachRCL3;
            case "IDLE":
                return IdleObjective;
        }
    };

    const Objective = getObjectiveClass(Memory.roomObjectives[roomName].name);

    const objective = new Objective(roomName);
    logger.debug(`Reloading ${objective}`);
    objective.reload();
    return objective;
}

type IConstructable<T> = new (...args: any) => T;
type ReloadableAgent = IConstructable<CreepAgent> | IConstructable<SpawnAgent>;
type ReloadableObjective = IConstructable<BaseObjective>;

type TASK_EXECUTOR_MEM_LOCS = "creeps" | "spawns";

/**
 * Make a function able to reload the agents operating in a given room.
 * @param memLoc location of the Memory and Game where objects can be retrieved
 */
function makeAgentReload(memLoc: TASK_EXECUTOR_MEM_LOCS) {
    const getAgentClass = (_memLoc: TASK_EXECUTOR_MEM_LOCS): ReloadableAgent => {
        switch (_memLoc) {
            case "creeps":
                return CreepAgent;
            case "spawns":
                return SpawnAgent;
        }
    };

    const Agent = getAgentClass(memLoc);

    const reloadAgent = (agentStore: IAgentStore, name: string, roomName: string) => {
        const agent = new Agent(name);

        try {
            agent.reload();
        } catch (err) {
            logger.warning(`Unable to reload ${agent} (name: ${name}): ${err} - discarding from store.`);
            return agent;
        }

        const agentController = agent.getController();
        if (agentController && agentController.roomObject.room.name === roomName) {
            // TODO: assign to the proper agent store directly
            agentStore[memLoc][name] = agent;
        }

        return agent;
    };

    return (agentStore: IAgentStore, roomName: string) => {
        for (const name in Memory[memLoc]) {
            if (!Memory[memLoc].hasOwnProperty(name)) {
                continue;
            }

            logger.debug(`Reloading ${name} from Memory`);
            reloadAgent(agentStore, name, roomName);
        }

        for (const name in Game[memLoc]) {
            if (!Game[memLoc].hasOwnProperty(name)) {
                continue;
            }
            if (agentStore[memLoc][name]) {
                continue;
            }
            logger.debug(`Reloading ${name} from Game`);
            reloadAgent(agentStore, name, roomName);
        }
    };
}
