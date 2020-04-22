import { BaseCreepProfile } from "./BaseCreepProfile";

/**
 * Worker creep profile, designed to utilize energy available in nearest containers.
 * The worker is not a very efficient energy carrier, and is best used when energy container is available nearby
 * in relatively large quantities.
 */
export class Worker extends BaseCreepProfile {
    constructor() {
        super("Worker", [CARRY, WORK, MOVE, MOVE]);
    }
    public incrementLevel(): void {
        this.bodyParts.push(CARRY);
        this.bodyParts.push(MOVE);
        this.level += 1;
    }

    public decrementLevel(): void {
        this.level -= 1;
        this.bodyParts = this.bodyParts.slice(0, -2);
    }
}
