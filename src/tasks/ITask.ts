export type TASK_TYPE = "TASK_SPAWN" | "TASK_HARVEST" | "TASK_HAUL";

export interface ITask<RoomObject> {
    execute(roomObject: RoomObject): void;
    completed(roomObject: RoomObject): boolean;
    toJSON(): TaskMemory;
    getType(): TASK_TYPE;
}

export abstract class BaseTask<RoomObject> implements ITask<RoomObject> {
    public executionStarted: boolean = false;

    public execute(roomObject: RoomObject) {
        this.executionStarted = true;
    }

    public abstract completed(roomObject: RoomObject): boolean;
    public abstract toJSON(): TaskMemory;
    public abstract getType(): TASK_TYPE;

    public reload(memory: TaskMemory) {
        this.executionStarted = memory.executionStarted;
    }

    public toString() {
        return `task ${this.getType()}`;
    }
}
