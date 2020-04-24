import { BaseController, Controllable } from "agents/controllers/BaseController";

export type TASK_TYPE = "TASK_SPAWN" | CREEP_TASK | "TASK_PLACE_CONSTRUCTION_SITES";

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

    /**
     * Indicate whether the given controller can execute the task.
     * By default this returns true all the time, but the method can be overridden
     * to save some unnecessary start/execute/complete cycles
     * @param controller controller executing the task
     */
    public canBeExecuted(controller: Controller) {
        return true;
    }
    public execute(controller: Controller) {
        this.executionStarted = true;
    }

    public abstract completed(controller: Controller): boolean;
    public abstract toJSON(): TaskMemory;
    public abstract getType(): TASK_TYPE;
    public toString() {
        return `task ${JSON.stringify(this.toJSON())}`;
    }
}
