import { COLORS, getLogger } from "utils/Logger";
import { BaseCreepTask } from "./creep/BaseCreepTask";
import { Harvest } from "./creep/Harvest";
import { Haul } from "./creep/Haul";
import { BaseTask, TASK_TYPE } from "./ITask";
import { SpawnTask } from "./Spawn";

const logger = getLogger("tasks.TaskExecutor", COLORS.tasks);

export abstract class BaseTaskExecutor<RoomObjectType extends RoomObject, TaskType extends BaseTask<RoomObjectType>> {
    public taskQueue: TaskType[] = [];

    public reloadTasks(tasks: TaskMemory[]) {
        this.taskQueue = tasks.map(taskMemory => {
            const task = this.createTaskInstance(taskMemory);
            task.reload(taskMemory);
            return task;
        });
    }

    protected abstract createTaskInstance(task: TaskMemory): TaskType;

    public scheduleTask(task: TaskType) {
        this.taskQueue.push(task);
    }

    public save(): TaskMemory[] {
        return this.taskQueue.map(t => t.toJSON());
    }

    public execute(roomObject: RoomObjectType | undefined) {
        if (this.taskQueue.length === 0) {
            logger.warning(`${roomObject}: No task to perform`);
            return;
        }

        const currentTask = this.taskQueue[0];
        if (currentTask.executionStarted && this.hasTaskCompleted(currentTask, roomObject)) {
            this.onTaskExecutionCompletes(currentTask, roomObject);

            this.taskQueue.shift();

            if (this.taskQueue.length > 0) {
                this.onTaskExecutionStarts(this.taskQueue[0], roomObject);
            }
            this.execute(roomObject);
            return;
        }

        if (!currentTask.executionStarted) {
            this.onTaskExecutionStarts(currentTask, roomObject);
        }
        this.executeTask(currentTask, roomObject);
    }

    public hasTaskScheduled(task: TASK_TYPE): boolean {
        return this.taskQueue.some(t => t.getType() === task);
    }

    private executeTask(task: TaskType, roomObject: RoomObjectType | undefined) {
        if (roomObject) {
            logger.debug(`${roomObject} is executing ${task}`);
            task.executionStarted = true;
            return task.execute(roomObject);
        } else {
            logger.debug(`Not executing ${task} - room object is undefined`);
        }
    }

    private hasTaskCompleted(task: TaskType, roomObject: RoomObjectType | undefined) {
        if (!roomObject) {
            return false;
        }
        return task.completed(roomObject);
    }

    protected onTaskExecutionStarts(task: TaskType, roomObject: RoomObjectType | undefined) {
        logger.info(`${roomObject}: Started execution of task: ${task}`);
        return;
    }

    protected onTaskExecutionCompletes(task: TaskType, roomObject: RoomObjectType | undefined) {
        logger.info(`${roomObject}: Completed execution of task: ${task}`);
        return;
    }
}

export class CreepTaskExecutor extends BaseTaskExecutor<Creep, BaseCreepTask> {
    protected createTaskInstance(taskMemory: CreepTaskMemory): BaseCreepTask {
        switch (taskMemory.type) {
            case "TASK_HAUL":
                return new Haul();
            case "TASK_HARVEST":
                return new Harvest();
        }
    }

    protected onTaskExecutionStarts(task: BaseCreepTask, creep: Creep) {
        super.onTaskExecutionStarts(task, creep);
        creep.say(task.description());
    }
}

export class SpawnTaskExecutor extends BaseTaskExecutor<StructureSpawn, SpawnTask> {
    protected createTaskInstance(taskMemory: SpawnTaskMemory): SpawnTask {
        return new SpawnTask(taskMemory.target);
    }
}
