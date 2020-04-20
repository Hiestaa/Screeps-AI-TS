import { _cost, BaseCreepProfile } from "./BaseCreepProfile";

/**
 * Harvester creep profile, designed to do nothing else than sit near a source and harvest it.
 * It does not carry the energy back, nor does it transfer the energy anywhere. It mines, then let the energy drop.
 * It does hold a single CARRY body part to hold energy to perform some work activity while the assigned source is depleted.
 */
export class Harvester extends BaseCreepProfile {
    constructor(availableEnergy: number) {
        const bodyParts = [CARRY, WORK, MOVE];
        let level = 1;
        while (_cost(bodyParts) < availableEnergy) {
            bodyParts.push(WORK);
            level += 1;
        }
        super("Harvester", level - 1, bodyParts.slice(0, -1));
    }
}
