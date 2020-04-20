import { CreepAgent } from "agents/CreepAgent";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("objectives.IObjective", COLORS.objectives);

export interface IObjective {
    /**
     * Execute the operations for this objective
     * @param agentStore an access to the existing controllers after reload
     */
    execute(agents: CreepAgent[]): void;

    save(): ObjectiveMemory;
    reload(memory: ObjectiveMemory): void;
}

export abstract class BaseObjective implements IObjective {
    public abstract name: ObjectiveType;
    protected memory?: ObjectiveMemory;
    public battalionId: string;

    constructor(battalionId: string) {
        this.battalionId = battalionId;
    }

    public abstract execute(agents: CreepAgent[]): void;

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
}

export class IdleObjective extends BaseObjective {
    public name: ObjectiveType = "IDLE";

    public execute() {
        logger.warning(`Battalion ${this.battalionId} is idle`);
    }
}
