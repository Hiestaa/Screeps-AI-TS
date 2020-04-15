import { BaseController } from "controllers/BaseController";
import { BaseCreepTask } from "tasks/creep/BaseCreepTask";
import { Harvest } from "tasks/creep/Harvest";
import { Haul } from "tasks/creep/Haul";
import { BaseTask, TASK_TYPE } from "tasks/ITask";
import { SpawnTask } from "tasks/Spawn";
import { COLORS, getLogger, Logger } from "utils/Logger";

let logger = getLogger("controllers.taskExecutors.BaseTaskExecutor", COLORS.controllers);

/**
 * Base class for any object able to execute tasks.
 * Tasks executor manages tasks, that is initialize, schedule, reloads and execute them.
 */
export abstract class BaseTaskExecutor<
    RoomObjectType extends RoomObject,
    ControllerType extends BaseController<RoomObjectType>,
    TaskType extends BaseTask<RoomObjectType, ControllerType>
> {
    public taskQueue: TaskType[] = [];
    public abstract memoryLocation: "creeps" | "spawns";
    public name: string;
    public memory: { tasks: TaskMemory[] } = {
        tasks: [],
    };
    constructor(name: string, _logger?: Logger) {
        this.name = name;

        if (_logger) {
            logger = _logger;
        }
    }

    public reload() {
        const tasks = this.reloadTasks();
        if (tasks) {
            this.memory.tasks = tasks;
        }
        this.reloadControllers();
    }

    protected reloadTasks(): TaskMemory[] | void {
        const mem = Memory[this.memoryLocation][this.name];
        if (mem && mem.tasks) {
            this.taskQueue = mem.tasks.map(taskMemory => {
                const task = this.createTaskInstance(taskMemory);
                task.reload(taskMemory);
                return task;
            });
            return mem.tasks;
        }
    }

    protected abstract createTaskInstance(task: TaskMemory): TaskType;
    protected abstract reloadControllers(): void;
    protected abstract getController(): ControllerType | undefined;

    public scheduleTask(task: TaskType) {
        logger.info(`${this}: scheduling ${task}`);
        this.taskQueue.push(task);
    }

    public hasTaskScheduled(task: TASK_TYPE): boolean {
        return this.taskQueue.some(t => t.getType() === task);
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

    private saveTasks(mem: { tasks: TaskMemory[] }) {
        mem.tasks = this.taskQueue.map(t => t.toJSON());
    }

    public execute() {
        const controller = this.getController();
        if (this.taskQueue.length === 0) {
            logger.warning(`${controller}: No task to perform`);
            return;
        }

        const currentTask = this.taskQueue[0];
        if (currentTask.executionStarted && this.hasTaskCompleted(currentTask, controller)) {
            this.onTaskExecutionCompletes(currentTask, controller);

            this.taskQueue.shift();

            if (this.taskQueue.length > 0) {
                this.onTaskExecutionStarts(this.taskQueue[0], controller);
            }
            this.execute();
            return;
        }

        if (!currentTask.executionStarted) {
            this.onTaskExecutionStarts(currentTask, controller);
        }
        this.executeTask(currentTask, controller);
    }

    private executeTask(task: TaskType, controller: ControllerType | undefined) {
        if (controller) {
            logger.debug(`${controller} is executing ${task}`);
            task.executionStarted = true;
            return task.execute(controller);
        } else {
            logger.debug(`Not executing ${task} - room object is undefined`);
        }
    }

    private hasTaskCompleted(task: TaskType, controller: ControllerType | undefined) {
        if (!controller) {
            return false;
        }
        return task.completed(controller);
    }

    protected onTaskExecutionStarts(task: TaskType, controller: ControllerType | undefined) {
        logger.info(`${controller}: Started execution of task: ${task}`);
        return;
    }

    protected onTaskExecutionCompletes(task: TaskType, controller: ControllerType | undefined) {
        logger.info(`${controller}: Completed execution of task: ${task}`);
        return;
    }

    public toString() {
        return `task executor ${this.name};`;
    }
}
