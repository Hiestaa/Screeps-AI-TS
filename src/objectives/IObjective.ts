import { IAgentStore } from "phases/IAgentStore";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("objectives.IOBjective", COLORS.objectives);

export interface IObjective {
    /**
     * Execute the operations for this objective
     * @param agentStore an access to the existing controllers after reload
     */
    execute(agentStore: IAgentStore): void;

    save(): void;
    reload(): void;
}

export abstract class BaseObjective implements IObjective {
    public abstract name: ObjectiveType;
    protected memory?: ObjectiveMemory;
    public roomName: string;

    constructor(roomName: string) {
        this.roomName = roomName;
    }

    public abstract execute(agentStore: IAgentStore): void;

    public save() {
        Memory.roomObjectives[this.roomName] = {
            name: this.name,
        };
    }

    public reload() {
        this.memory = Memory.roomObjectives[this.roomName];
    }

    public toString() {
        return `objective ${this.name}`;
    }
}

export class IdleObjective extends BaseObjective {
    public name: ObjectiveType = "IDLE";

    public execute(agentStore: IAgentStore) {
        logger.warning(`Room ${agentStore.room.name} is idle`);
    }
}
