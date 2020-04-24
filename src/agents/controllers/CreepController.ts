import { COLORS, getLogger } from "utils/Logger";
import { BaseController, ReturnCodeSwitcher } from "./BaseController";

const logger = getLogger("agents.controllers.CreepController", COLORS.controllers);

export class CreepController extends BaseController<Creep> {
    public roomObject: Creep;
    public creep: Creep;

    constructor(roomObject: Creep) {
        super();
        this.roomObject = roomObject;
        this.creep = roomObject;
    }

    public transfer(
        target: Creep | PowerCreep | Structure<StructureConstant>,
        resourceType: ResourceConstant,
        amount?: number | undefined,
    ): ReturnCodeSwitcher<ScreepsReturnCode> {
        return this.doSwitch<ScreepsReturnCode>(this.creep.transfer(target, resourceType, amount), "transfer");
    }

    public moveTo(
        x: number | RoomPosition | { pos: RoomPosition },
        y?: number | MoveToOpts,
        opts?: MoveToOpts,
    ): ReturnCodeSwitcher<CreepMoveReturnCode | ERR_NO_PATH | ERR_INVALID_TARGET | ERR_NOT_FOUND> {
        if (typeof x === "number" && typeof y === "number") {
            const _opts = Object.assign({}, opts, { visualizePathStyle: { stroke: "#FFEA00" } });
            return this.doSwitch<CreepMoveReturnCode | ERR_NO_PATH | ERR_INVALID_TARGET | ERR_NOT_FOUND>(
                this.creep.moveTo(x, y, _opts),
                "moveTo",
            ).on(ERR_NO_PATH, () => {
                logger.debug(`${this}: no path to target: ${x}, ${y}`);
            });
        } else if (typeof x !== "number" && typeof y !== "number") {
            const _opts = Object.assign({}, y, { visualizePathStyle: { stroke: "#FFEA00" } });
            return this.doSwitch<CreepMoveReturnCode | ERR_NO_PATH | ERR_INVALID_TARGET | ERR_NOT_FOUND>(
                this.creep.moveTo(x, _opts),
                "moveTo",
            ).on(ERR_NO_PATH, () => {
                logger.debug(`${this}: no path to target: ${x}`);
            });
        } else {
            throw new Error("CreepController.moveTo: Invalid Argument Types");
        }
    }

    // public attack(target: Creep | PowerCreep | Structure<StructureConstant>): ReturnCodeSwitcher<CreepActionReturnCode> {};
    // public attackController(target: StructureController): ReturnCodeSwitcher<CreepActionReturnCode> {};
    public build(
        target: ConstructionSite<BuildableStructureConstant>,
    ): ReturnCodeSwitcher<0 | -1 | -4 | -6 | -7 | -9 | -11 | -12 | -14> {
        return this.doSwitch<0 | -1 | -4 | -6 | -7 | -9 | -11 | -12 | -14>(this.creep.build(target), "build");
    }
    // public cancelOrder(methodName: string): ReturnCodeSwitcher<0 | -5> {};
    // public dismantle(target: Structure<StructureConstant>): ReturnCodeSwitcher<CreepActionReturnCode> {};
    // public drop(resourceType: ResourceConstant, amount?: number | undefined): ReturnCodeSwitcher<0 | -1 | -4 | -6> {};
    // public generateSafeMode(target: StructureController): ReturnCodeSwitcher<CreepActionReturnCode> {};
    public harvest(
        target: Source | Mineral<MineralConstant> | Deposit,
    ): ReturnCodeSwitcher<0 | -1 | -4 | -5 | -6 | -7 | -9 | -11 | -12> {
        return this.doSwitch<0 | -1 | -4 | -5 | -6 | -7 | -9 | -11 | -12>(this.creep.harvest(target), "harvest");
    }
    // public heal(target: AnyCreep): ReturnCodeSwitcher<CreepActionReturnCode> {};
    // public move{ (direction: DirectionConstant): CreepMoveReturnCode; (target: Creep): 0 | -1 | -4 | -9 | -10 };
    // public moveByPath(path: string | PathStep[] | RoomPosition[]): ReturnCodeSwitcher<0 | -1 | -4 | -5 | -10 | -11 | -12> {};
    // public notifyWhenAttacked(enabled: boolean): ReturnCodeSwitcher<0 | -1 | -4 | -10> {};
    public pickup(target: Resource<ResourceConstant>): ReturnCodeSwitcher<0 | -1 | -4 | -7 | -8 | -9 | -11 | -12> {
        return this.doSwitch<0 | -1 | -4 | -7 | -8 | -9 | -11 | -12>(this.creep.pickup(target), "pickup");
    }
    // public pull(target: Creep): ReturnCodeSwitcher<0 | -1 | -4 | -7 | -9 | -12> {};
    // public rangedAttack(target: Creep | PowerCreep | Structure<StructureConstant>): ReturnCodeSwitcher<CreepActionReturnCode> {};
    // public rangedHeal(target: AnyCreep): ReturnCodeSwitcher<CreepActionReturnCode> {};
    // public rangedMassAttack(): ReturnCodeSwitcher<0 | -1 | -4 | -12> {};
    public repair(target: Structure<StructureConstant>): ReturnCodeSwitcher<0 | -1 | -4 | -6 | -7 | -9 | -11 | -12> {
        return this.doSwitch<0 | -1 | -4 | -6 | -7 | -9 | -11 | -12>(this.creep.repair(target), "repair");
    }
    // public reserveController(target: StructureController): ReturnCodeSwitcher<CreepActionReturnCode> {};
    // public say(message: string, toPublic?: boolean | undefined): ReturnCodeSwitcher<0 | -1 | -4> {};
    // public signController(target: StructureController, text: string): ReturnCodeSwitcher<0 | -4 | -7 | -9> {};
    // public suicide(): ReturnCodeSwitcher<0 | -1 | -4> {};
    public upgradeController(target: StructureController): ReturnCodeSwitcher<ScreepsReturnCode> {
        return this.doSwitch<ScreepsReturnCode>(this.creep.upgradeController(target), "upgradeController");
    }
    public withdraw(
        target: Structure<StructureConstant> | Tombstone | Ruin,
        resourceType: ResourceConstant,
        amount?: number | undefined,
    ): ReturnCodeSwitcher<ScreepsReturnCode> {
        return this.doSwitch<ScreepsReturnCode>(this.creep.withdraw(target, resourceType, amount), "withdraw");
    }
}
