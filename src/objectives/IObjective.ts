import { CreepAgent } from "agents/CreepAgent";
import { RoomAgent } from "agents/RoomAgent";
import { SpawnAgent } from "agents/SpawnAgent";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("objectives.IObjective", COLORS.objectives);

export interface IObjective {
    /**
     * Execute the operations for this objective
     * @param agentStore an access to the existing controllers after reload
     */
    execute(agents: CreepAgent[], room: RoomAgent, spawn: SpawnAgent): void;

    save(): ObjectiveMemory;
    reload(memory: ObjectiveMemory): void;

    /**
     * Provide an estimation of the required ideal workforce that can be used to execute this objective.
     * This should not account for existing creeps or pending creep requests.
     * @return Array of spawn requests. Battalion will do best effort to satisfy them all in a timely manner
     */
    estimateRequiredWorkForce(room: RoomAgent): SpawnRequest[];
}

export abstract class BaseObjective implements IObjective {
    public abstract name: ObjectiveType;
    protected memory?: ObjectiveMemory;
    public battalionId: string;

    constructor(battalionId: string) {
        this.battalionId = battalionId;
    }

    /**
     *
     * @param agents agents executing the objective
     * @param room room in which the objective is executed
     * @param spawn spawn the battalion executing is related to
     */
    public abstract execute(agents: CreepAgent[], room: RoomAgent, spawn: SpawnAgent): void;

    public save(): ObjectiveMemory {
        return {
            name: this.name,
        };
    }

    public reload(memory: ObjectiveMemory) {
        this.memory = memory;
    }

    public toString() {
        return `objective ${this.name}`;
    }

    public abstract estimateRequiredWorkForce(room: RoomAgent): SpawnRequest[];
}

export class IdleObjective extends BaseObjective {
    public name: ObjectiveType = "IDLE";

    public execute() {
        logger.warning(`Battalion ${this.battalionId} is idle`);
    }

    public estimateRequiredWorkForce() {
        return [];
    }
}
