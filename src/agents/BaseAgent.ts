import { BaseController, Controllable } from "agents/controllers/BaseController";
import { BaseCreepTask } from "tasks/creep/BaseCreepTask";
import { Harvest } from "tasks/creep/Harvest";
import { Haul } from "tasks/creep/Haul";
import { BaseTask, TASK_TYPE } from "tasks/ITask";
import { SpawnTask } from "tasks/Spawn";
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
    TaskType extends BaseTask<ControlledRoomObjectType, ControllerType>
> {
    public taskQueue: TaskType[] = [];
    public abstract memoryLocation: "creeps" | "spawns" | "rooms";
    public name: string;
    public memory: BaseMemory = {
        tasks: [],
        idleTime: 0,
    };
    public logger: Logger = logger;

    constructor(name: string, _logger?: Logger) {
        this.name = name;

        if (_logger) {
            this.logger = _logger;
        }
    }

    /**
     * Reload the agent and its associated tasks from the memory assigned to this particular name
     * Throws an error if the reload process couldn't complete (memory wipe, agent death, etc...)
     */
    public reload() {
        const mem = Memory[this.memoryLocation][this.name];
        const tasks = this.reloadTasks(mem);
        if (tasks) {
            this.memory.tasks = tasks;
            this.memory.idleTime = mem.idleTime;
        }
        this.reloadControllers();
    }

    protected reloadTasks(mem: BaseMemory): TaskMemory[] | void {
        if (mem && mem.tasks) {
            this.taskQueue = mem.tasks.map(taskMemory => this._createTaskInstance(taskMemory));
            return mem.tasks;
        }
    }
    private _createTaskInstance(taskMemory: TaskMemory): TaskType {
        const taskInstance = this.createTaskInstance(taskMemory);
        taskInstance.executionStarted = taskMemory.executionStarted;
        return taskInstance;
    }

    protected abstract createTaskInstance(task: TaskMemory): TaskType;
    protected abstract reloadControllers(): void;
    public abstract getController(): ControllerType | undefined;

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
        const mem: BaseMemory = { tasks: [], idleTime: this.memory.idleTime || 0 };
        this.saveTasks(mem);
        Memory[this.memoryLocation][this.name] = mem;
    }

    private saveTasks(mem: BaseMemory) {
        mem.tasks = this.taskQueue.map(t => t.toJSON());
    }

    public execute() {
        const controller = this.getController();
        if (this.taskQueue.length === 0) {
            this.memory.idleTime += 1;
            if (this.memory.idleTime > 0 && this.memory.idleTime % WARN_IDLE_PERIOD === 0) {
                this.logger.warning(`${controller}: No task to perform (idle time: ${this.memory.idleTime})`);
            }
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

        // re-check if task has completed, saves some memory in case the task Memory doesn't need to be saved
        this.hasTaskCompleted(currentTask, controller);
    }

    private hasTaskCompleted(currentTask: TaskType, controller: ControllerType | undefined) {
        const hasTaskCompleted = currentTask.executionStarted && controller && currentTask.completed(controller);
        if (hasTaskCompleted) {
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
