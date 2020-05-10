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
        this.bodyParts.push(WORK);
        this.bodyParts.push(MOVE);
        this.bodyParts.push(MOVE);
        this.level += 1;
    }
}
