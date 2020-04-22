import { BaseCreepProfile } from "./BaseCreepProfile";

/**
 * Harvester creep profile, designed to do nothing else than sit near a source and harvest it.
 * It does not carry the energy back, nor does it transfer the energy anywhere. It mines, then let the energy drop.
 * It does hold a single CARRY body part to hold energy to perform some work activity while the assigned source is depleted.
 */
export class Harvester extends BaseCreepProfile {
    constructor() {
        super("Harvester", [CARRY, WORK, MOVE]);
    }

    public incrementLevel(): void {
        this.bodyParts.push(WORK);
        this.level += 1;
    }

    public decrementLevel(): void {
        this.level -= 1;
        this.bodyParts = this.bodyParts.slice(0, -1);
    }
}
