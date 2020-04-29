import { BaseCreepProfile } from "./BaseCreepProfile";

/**
 * Warrior creep profile, designed to be part of a battalion that defends a colony or attacks other colonies.
 * The warrior should be set to one of the three main types: melee attacker, ranged attacker or healer.
 * The type is defined by the body part given to the constructor.
 */
export class Warrior extends BaseCreepProfile {
    private mainBodyPart: ATTACK | RANGED_ATTACK | HEAL;

    constructor(mainBodyPart: ATTACK | RANGED_ATTACK | HEAL) {
        const names: { [key in ATTACK | RANGED_ATTACK | HEAL]: CREEP_PROFILE } = {
            [ATTACK]: "M-Attacker",
            [RANGED_ATTACK]: "R-Attacker",
            [HEAL]: "Healer",
        };
        super(names[mainBodyPart], [MOVE, MOVE]);
        this.mainBodyPart = mainBodyPart;
    }

    public incrementLevel(): void {
        this.bodyParts.push(this.mainBodyPart);
        const mainToToughRatio = BODYPART_COST[this.mainBodyPart] / BODYPART_COST[TOUGH];
        for (let index = 0; index < mainToToughRatio; index++) {
            this.bodyParts.unshift(TOUGH);
        }

        this.bodyParts.push(MOVE);

        this.level += 1;
    }
}
