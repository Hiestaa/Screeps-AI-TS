import { BaseTask, TASK_TYPE } from "tasks/ITask";
import { BaseTaskExecutor } from "tasks/TaskExecutor";
import { COLORS, getLogger, Logger } from "utils/Logger";

type IConstructable<T> = new (...args: any) => T;

let logger = getLogger("controllers.BaseTaskExecutorController", COLORS.controllers);

export abstract class BaseTaskExecutorController<
    RoomObjectType extends RoomObject,
    TaskType extends BaseTask<RoomObjectType>,
    TaskExecutor extends BaseTaskExecutor<RoomObjectType, TaskType>
> {
    private taskExecutor: TaskExecutor;
    public abstract memoryLocation: "creeps" | "spawns";
    public name: string;
    public memory: { tasks: TaskMemory[] } = {
        tasks: [],
    };

    constructor(name: string, ConstructableTaskExecutor: IConstructable<TaskExecutor>, _logger?: Logger) {
        this.name = name;
        this.taskExecutor = new ConstructableTaskExecutor();
        if (_logger) {
            logger = _logger;
        }
    }

    public scheduleTask(task: TaskType) {
        logger.info(`${this}: scheduling ${task}`);
        this.taskExecutor.scheduleTask(task);
    }

    public hasTaskScheduled(taskType: TASK_TYPE): boolean {
        return this.taskExecutor.hasTaskScheduled(taskType);
    }

    public reload() {
        const tasks = this.reloadTasks();
        if (tasks) {
            this.memory.tasks = tasks;
        }
        this.reloadGameObjects();
    }

    protected reloadTasks(): TaskMemory[] | void {
        const mem = Memory[this.memoryLocation][this.name];
        if (mem && mem.tasks) {
            this.taskExecutor.reloadTasks(mem.tasks);
            return mem.tasks;
        }
    }

    public abstract reloadGameObjects(): void;
    public abstract getRoomObject(): RoomObjectType | undefined;

    public saveTasks(mem: { tasks: TaskMemory[] }) {
        mem.tasks = this.taskExecutor.save();
    }

    public save() {
        const mem: { tasks: TaskMemory[] } = { tasks: [] };
        this.saveTasks(mem);
        // if we don't allow overriding the memory here, whatever task scheduled
        // during this game loop won't be saved to memory for the next loop.
        // if (!Memory[this.memoryLocation][this.name]) {
        Memory[this.memoryLocation][this.name] = mem;
        // }
    }

    public execute() {
        this.taskExecutor.execute(this.getRoomObject());
    }

    public toString() {
        return `controller ${this.name}`;
    }
}
