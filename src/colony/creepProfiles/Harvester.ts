import { BaseCreepProfile } from "./BaseCreepProfile";

/**
 * 5 work part * 2 energy per part per tick = 10 energy per tick
 *  = 10 * 300 energy in 300 ticks = 3000 energy in 300 tick
 *  = all energy harvested within the 300 ticks before source replenishes.
 * TODO: make this a function of the actual source max cap / refresh timer of the room?
 */
const MAX_WORK_PARTS = 5;

/**
 * Harvester creep profile, designed to do nothing else than sit near a source and harvest it.
 * It does not carry the energy back, nor does it transfer the energy anywhere. It mines, then let the energy drop.
 */
export class Harvester extends BaseCreepProfile {
    constructor() {
        super("Harvester", [WORK, MOVE]);
    }

    public incrementLevel(): void {
        this.bodyParts.push(WORK);
        this.level += 1;
    }

    public exceededMaxLevel(): boolean {
        return this.bodyParts.filter(bp => bp === WORK).length > MAX_WORK_PARTS;
    }
}
