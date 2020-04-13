import { IControllerStore } from "phases/IControllerStore";

export interface IObjective {
    /**
     * Execute the operations for this objective
     * @param controllerStore an access to the existing controllers after reload
     * @return the next objective in line, may be the current one if not yet completed
     */
    execute(controllerStore: IControllerStore): IObjective;

    save(): void;
    reload(): void;
}

export abstract class BaseObjective implements IObjective {
    protected abstract name: OBJECTIVE_TYPE;
    protected memory?: ObjectiveMemory;

    public abstract execute(controllerStore: IControllerStore): BaseObjective;

    public save() {
        Memory.objective = {
            name: this.name,
        };
    }

    public reload() {
        this.memory = Memory.objective;
    }

    public toString() {
        return `objective ${this.name}`;
    }
}

export type OBJECTIVE_TYPE = "REACH_RCL1";
