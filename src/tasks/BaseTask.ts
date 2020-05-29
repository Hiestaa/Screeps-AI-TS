import { BaseController, Controllable } from "agents/controllers/BaseController";
import { COLORS, getLogger } from "utils/Logger";


const logger = getLogger('tasks.BaseTask', COLORS.tasks);

/**
 * Base Class for any task object. The interface describes the task load/execute/save cycle:
 * * When scheduling a new task, build a new task from its constructor. Each children define its own set of parameters.
 * * When reloading a task, the agent will task care of converting the generic `TaskMemory` instance into the type for this task (this could be improved)
 * * During execution phase, Agent execute the task given the controller for this task
 * * During the save phase, the task memory is retrieved and saved into the global memory object using `toJSON()`
 *
 * TODO: make the children task specify the kind of memory as another generic parameter
 */
export abstract class BaseTask<RO extends Controllable, Controller extends BaseController<RO>> {
    public executionStarted: boolean = false;
    public executionPeriod: number = 1;
    public executionPaused: number = 0;
    // populated by the data persisted by the previous task
    public prevTaskPersist?: PersistTaskMemory;

    /**
     * Indicate whether the given controller can execute the task.
     * By default this returns true all the time, but the method can be overridden
     * to save some unnecessary start/execute/complete cycles
     * @param controller controller executing the task
     */
    public canBeExecuted(controller: Controller) {
        return true;
    }
    public pause(duration: number) {
        this.executionPaused = Game.time + duration;
    }
    public isPaused(): boolean {
        return Game.time < this.executionPaused || Game.time % this.executionPeriod !== 0;
    }
    public execute(controller: Controller) {
        this.executionStarted = true;
    }

    public abstract completed(controller: Controller): boolean;
    public abstract toJSON(): TaskMemory;
    public abstract getType(): TASK_TYPE;

    /**
     * Override to persist any data for the next executed task to use.
     */
    public persistAfterCompletion(): undefined | PersistTaskMemory {
        return;
    }

    /**
     * Called a single time on task completion
     * @param controller controller executing this task
     */
    public onComplete(controller: Controller | undefined) {
        return;
    };

    /**
     * Called when interrupting a task before it is completed, for instance on creep death.
     * @param id identifier of the agent that got interrupted executing this task.
     */
    public onInterrupt(id: string) {
        logger.info(`${id}: interrupted ${this} before execution completion.`)
    }

    public toString() {
        return `task ${this.getType()} ${JSON.stringify(this.toJSON())}`;
    }

}
