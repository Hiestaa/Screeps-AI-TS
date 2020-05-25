// For some reason these are inaccurate on the private server
const BODYPART_COST = {
    move: 50,
    work: 100,
    attack: 80,
    carry: 50,
    heal: 250,
    ranged_attack: 150,
    tough: 10,
    claim: 600,
};

export abstract class BaseCreepProfile {
    public name: CREEP_PROFILE;
    public bodyParts: BodyPartConstant[];
    public level: number;

    constructor(name: CREEP_PROFILE, initialBodyParts: BodyPartConstant[]) {
        this.name = name;
        this.level = 1;
        this.bodyParts = initialBodyParts;
    }

    /**
     * Add 1 level worth of body parts to this creep profile
     * As a rule of thumb for the number of MOVE body parts to reach the maximum speed:
     * - a creep needs half the number of non-MOVE body parts travelling on road,
     * - the same number of non-MOVE body parts travelling on plain and
     * - 5 times the number of non-MOVE body parts travelling on swamp.
     */
    public abstract incrementLevel(): void;

    public clone(): BaseCreepProfile {
        const copy = new (this.constructor as new () => BaseCreepProfile)();
        Object.assign(copy, this, { bodyParts: this.bodyParts.slice() });
        return copy;
    }

    public cost(): number {
        return this.bodyParts.reduce((acc, bp) => {
            return acc + BODYPART_COST[bp];
        }, 0);
    }

    public toString() {
        return (
            `${this.name} creep profile, level ${this.level} with body parts: ` +
            `${this.bodyParts.join(",")} (cost: ${this.cost()})`
        );
    }

    public exceededMaxLevel(): boolean {
        return this.bodyParts.length > MAX_CREEP_SIZE;
    }
}
