import { BaseController } from "agents/controllers/BaseController";
import { BaseCreepTask } from "tasks/creep/BaseCreepTask";
import { Harvest } from "tasks/creep/Harvest";
import { Haul } from "tasks/creep/Haul";
import { BaseTask, TASK_TYPE } from "tasks/ITask";
import { SpawnTask } from "tasks/Spawn";
import { COLORS, getLogger, Logger } from "utils/Logger";

const logger = getLogger("controllers.agents.BaseAgent", COLORS.controllers);

/**
 * Base class for any agent.
 * Agent initialize, schedule, reloads and execute tasks given the controller
 *  for the room object performing the task.
 * TODO: add the ability to send and receive messages
 *  To make implementation and usage easier try using a client/server approach with a global message server singleton
 *   storing messages indexed by destination and visible to recipient only
 *      -> can be reused to set status as sending messages to oneself but visible to everybody
 */
export abstract class BaseAgent<
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
    public logger: Logger = logger;

    constructor(name: string, _logger?: Logger) {
        this.name = name;

        if (_logger) {
            this.logger = _logger;
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
        this.logger.info(`${this}: scheduling ${task}`);
        this.taskQueue.push(task);
    }

    public hasTaskScheduled(task: TASK_TYPE): boolean {
        return this.taskQueue.some(t => t.getType() === task);
    }

    public getScheduledTasks(task: TASK_TYPE): TaskType[] {
        return this.taskQueue.filter(t => t.getType() === task);
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
            this.logger.warning(`${controller}: No task to perform`);
            return;
        }

        const currentTask = this.taskQueue[0];
        if (this.hasTaskCompleted(currentTask, controller)) {
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

        // re-check if task has completed, saves some memory in case the task doesnt need to be saved
        this.hasTaskCompleted(currentTask, controller);
    }

    private hasTaskCompleted(currentTask: TaskType, controller: ControllerType | undefined) {
        const hasTaskCompleted = controller && currentTask.completed(controller);
        if (currentTask.executionStarted && hasTaskCompleted) {
            this.onTaskExecutionCompletes(currentTask, controller);

            this.taskQueue.shift();

            return true;
        }
        return false;
    }

    private executeTask(task: TaskType, controller: ControllerType | undefined) {
        if (controller) {
            this.logger.debug(`${controller} is executing ${task}`);
            task.executionStarted = true;
            return task.execute(controller);
        } else {
            this.logger.debug(`Not executing ${task} - room object is undefined`);
        }
    }

    protected onTaskExecutionStarts(task: TaskType, controller: ControllerType | undefined) {
        this.logger.info(`${controller}: Started execution of task: ${task}`);
        return;
    }

    protected onTaskExecutionCompletes(task: TaskType, controller: ControllerType | undefined) {
        this.logger.info(`${controller}: Completed execution of task: ${task}`);
        return;
    }

    public toString() {
        return `agent ${this.name};`;
    }
}
