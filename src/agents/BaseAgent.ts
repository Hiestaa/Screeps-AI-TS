import { BaseController, Controllable } from "agents/controllers/BaseController";
import { BaseTask, TASK_TYPE } from "tasks/BaseTask";
import { COLORS, getLogger, Logger } from "utils/Logger";

const logger = getLogger("controllers.agents.BaseAgent", COLORS.controllers);
const WARN_IDLE_PERIOD = 100;

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
    ControlledRoomObjectType extends Controllable,
    ControllerType extends BaseController<ControlledRoomObjectType>,
    TaskType extends BaseTask<ControlledRoomObjectType, ControllerType>,
    MemoryType extends BaseMemory
> {
    public taskQueue: TaskType[] = [];
    public name: string;
    public memory: MemoryType;
    public logger: Logger = logger;

    constructor(name: string, memoryLocation: { [key: string]: MemoryType }, _logger?: Logger) {
        this.name = name;

        if (_logger) {
            this.logger = _logger;
        }

        this.memory = memoryLocation[name] || {
            tasks: [],
            idleTime: 0,
        };
        this.reload();
    }

    /**
     * Reload the agent and its associated tasks from the memory assigned to this particular name
     * Throws an error if the reload process couldn't complete (memory wipe, agent death, etc...)
     */
    private reload(): void {
        this.reloadTasks(this.memory);
        this.reloadControllers();
    }

    protected reloadTasks(mem: MemoryType): TaskMemory[] | void {
        if (mem && mem.tasks) {
            this.taskQueue = mem.tasks.map(taskMemory => this._createTaskInstance(taskMemory));
        }
    }
    private _createTaskInstance(taskMemory: TaskMemory): TaskType {
        const taskInstance = this.createTaskInstance(taskMemory);
        taskInstance.executionStarted = taskMemory.executionStarted;
        taskInstance.executionPaused = taskMemory.executionPaused;
        return taskInstance;
    }

    protected abstract createTaskInstance(task: TaskMemory): TaskType;
    protected abstract reloadControllers(): void;
    public abstract getController(): ControllerType | undefined;

    public scheduleTask(task: TaskType) {
        this.logger.debug(`${this}: scheduling ${task}`);
        this.taskQueue.push(task);
    }

    public replaceTask(task: TaskType) {
        if (this.taskQueue.length === 0) {
            this.taskQueue.push(task);
            this.logger.info(`${this}: replacing current task with ${task}`);
        } else {
            this.logger.info(`${this}: replacing ${this.taskQueue[0]} with ${task}`);
            this.taskQueue[0] = task;
        }
    }

    public hasTaskScheduled(task: TASK_TYPE): boolean {
        return this.taskQueue.some(t => t.getType() === task);
    }

    public getScheduledTasks(task: TASK_TYPE): TaskType[] {
        return this.taskQueue.filter(t => t.getType() === task);
    }

    public save() {
        const mem: MemoryType = this.memory;
        mem.tasks = this.taskQueue.map(t => t.toJSON());
        this.commitToMemory(mem);
    }

    protected abstract commitToMemory(memory: MemoryType): void;

    public execute() {
        const controller = this.getController();
        if (this.taskQueue.length === 0) {
            this.memory.idleTime += 1;
            if (this.memory.idleTime > 0 && this.memory.idleTime % WARN_IDLE_PERIOD === 0) {
                this.logger.warning(`${controller}: No task to perform (idle time: ${this.memory.idleTime})`);
            }
            return;
        }

        let currentTask = this.taskQueue[0];
        while (!this.canExecuteTask(currentTask, controller)) {
            this.logger.debug(`${controller}: Cannot execute task: ${currentTask} - discarding.`);
            this.taskQueue.shift();

            if (!this.taskQueue.length) {
                return;
            }

            currentTask = this.taskQueue[0];
        }

        if (this.hasTaskCompleted(currentTask, controller)) {
            if (this.taskQueue.length > 0) {
                // the task hasn't been started yet, but we'll call `onExecutionStart` in the `execute` call
                // this.onTaskExecutionStarts(this.taskQueue[0], controller);
                this.execute();
            }
            return;
        }

        if (!currentTask.executionStarted && !currentTask.isPaused()) {
            this.onTaskExecutionStarts(currentTask, controller);
        }
        this.executeTask(currentTask, controller);

        // re-check if task has completed, saves some memory in case the task Memory doesn't need to be saved
        this.hasTaskCompleted(currentTask, controller);
    }

    private hasTaskCompleted(currentTask: TaskType, controller: ControllerType | undefined) {
        if (currentTask.isPaused()) {
            return false;
        }
        const hasTaskCompleted = currentTask.executionStarted && controller && currentTask.completed(controller);
        if (hasTaskCompleted) {
            this.onTaskExecutionCompletes(currentTask, controller);

            this.taskQueue.shift();

            return true;
        }
        return false;
    }

    private canExecuteTask(currentTask: TaskType, controller: ControllerType | undefined) {
        return controller && currentTask.canBeExecuted(controller);
    }

    private executeTask(task: TaskType, controller: ControllerType | undefined) {
        if (task.isPaused()) {
            logger.debug(`Not executing ${task} - task is currently on pause.`);
        } else if (controller) {
            this.logger.debug(`${controller} is executing ${task}`);
            task.executionStarted = true;
            return task.execute(controller);
        } else {
            this.logger.error(`Not executing ${task} - controller is undefined`);
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
