import { CreepController } from "agents/controllers/CreepController";
import { BaseCreepTask } from "tasks/creep/BaseCreepTask";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("tasks.creep.Reach", COLORS.tasks);

const DESTINATION_REACHED_DISTANCE = 5;
const MAX_REACH_ATTEMPT = 10;

/**
 * Simply reach the destination point.
 * Stops if path get blocked.
 * TODO: make it insist a little longer than 1 turn
 */
export class Reach extends BaseCreepTask {
    public destination: { x: number; y: number };
    // number of cycles trying to reach the destination without being able to find a suitable path.
    private noPath: number = 0;
    // number of cycles trying to reach the destination while under a reasonable distance
    // after MAX_REACH_ATTEMPT the task will be considered complete
    private destinationReached: number = 0;

    constructor(destination: { x: number; y: number }, noPath?: number, destinationReached?: number) {
        super("TASK_REACH");
        this.destination = destination;
        this.noPath = noPath || 0;
        this.destinationReached = destinationReached || 0;
    }

    public canBeExecuted(creepCtl: CreepController) {
        return true;
    }

    public execute(creepCtl: CreepController) {
        const range = creepCtl.creep.pos.getRangeTo(this.destination.x, this.destination.y);
        if (range < DESTINATION_REACHED_DISTANCE) {
            this.destinationReached += 1;
            if (this.destinationReached >= MAX_REACH_ATTEMPT) {
                logger.warning(
                    `Reach task completed (range: ${range} to [${this.destination.x},${this.destination.y}] for ${this.destinationReached} cycles)`,
                );
            }
        }
        return creepCtl
            .moveTo(this.destination.x, this.destination.y)
            .on(OK, () => {
                this.noPath = 0;
            })
            .on(ERR_NO_PATH, () => {
                this.noPath += 1;
                if (this.noPath >= MAX_REACH_ATTEMPT) {
                    logger.warning(
                        `Reach task completed (no path to [${this.destination.x},${this.destination.y}] for ${this.noPath} cycles)`,
                    );
                }
            })
            .logFailure();
    }

    public toJSON(): ReachTaskMemory {
        const json = super.toJSON();
        const memory: ReachTaskMemory = {
            destination: this.destination,
            noPath: this.noPath,
            destinationReached: this.destinationReached,
            ...json,
        };
        return memory;
    }

    public completed(creepCtl: CreepController) {
        return this.noPath > MAX_REACH_ATTEMPT || this.destinationReached > MAX_REACH_ATTEMPT;
    }

    public description() {
        return "🚗";
    }
}
