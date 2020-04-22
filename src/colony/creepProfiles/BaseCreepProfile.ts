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
     */
    public abstract incrementLevel(): void;
    /**
     * Remove 1` level worth of body parts from this creep profile
     */
    public abstract decrementLevel(): void;

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
}
