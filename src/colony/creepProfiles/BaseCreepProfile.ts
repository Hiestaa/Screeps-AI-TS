export abstract class BaseCreepProfile {
    public name: string;
    public bodyParts: BodyPartConstant[];
    public level: number;
    public _cost: number | undefined;

    constructor(name: string, level: number, bodyParts: BodyPartConstant[]) {
        this.name = name;
        this.level = level;
        this.bodyParts = bodyParts;
    }

    public cost(): number {
        this._cost = this._cost || _cost(this.bodyParts);
        return this._cost;
    }
}

export function _cost(bodyParts: BodyPartConstant[]) {
    return bodyParts.reduce((acc, bp) => {
        return acc + BODYPART_COST[bp];
    }, 0);
}
