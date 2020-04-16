import { BaseController } from "agents/controllers/BaseController";

export type TASK_TYPE = "TASK_SPAWN" | "TASK_HARVEST" | "TASK_HAUL";

export interface ITask<RO extends RoomObject, Controller extends BaseController<RO>> {
    execute(roomObject: Controller): void;
    completed(roomObject: Controller): boolean;
    toJSON(): TaskMemory;
    getType(): TASK_TYPE;
}

export abstract class BaseTask<RO extends RoomObject, Controller extends BaseController<RO>>
    implements ITask<RO, Controller> {
    public executionStarted: boolean = false;

    public execute(roomObject: Controller) {
        this.executionStarted = true;
    }

    public abstract completed(roomObject: Controller): boolean;
    public abstract toJSON(): TaskMemory;
    public abstract getType(): TASK_TYPE;

    public reload(memory: TaskMemory) {
        this.executionStarted = memory.executionStarted;
    }

    public toString() {
        return `task ${JSON.stringify(this.toJSON())}`;
    }
}
