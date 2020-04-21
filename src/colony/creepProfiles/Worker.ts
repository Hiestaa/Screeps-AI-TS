import { _cost, BaseCreepProfile } from "./BaseCreepProfile";

/**
 * Worker creep profile, designed to utilize energy available in nearest containers.
 * The worker is not a very efficient energy carrier, and is best used when energy container is available nearby
 * in relatively large quantities.
 */
export class Worker extends BaseCreepProfile {
    constructor(availableEnergy: number) {
        const bodyParts = [CARRY, WORK, MOVE, MOVE];
        let level = 1;
        while (_cost(bodyParts) < availableEnergy) {
            bodyParts.push(WORK);
            bodyParts.push(CARRY);
            level += 1;
        }
        super("Worker", level - 1, bodyParts.slice(0, -2));
    }
}
