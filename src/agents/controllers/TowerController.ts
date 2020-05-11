import { BaseController, ReturnCodeSwitcher } from "./BaseController";

export class TowerController extends BaseController<StructureTower> {
    public roomObject: StructureTower;
    public tower: StructureTower;

    constructor(roomObject: StructureTower) {
        super();
        this.roomObject = roomObject;
        this.tower = roomObject;
    }
    public attack(target: AnyCreep): ReturnCodeSwitcher<ScreepsReturnCode> {
        return this.doSwitch(this.tower.attack(target), 'attack');
    }
    public heal(target: AnyCreep): ReturnCodeSwitcher<ScreepsReturnCode> {
        return this.doSwitch(this.tower.heal(target), 'heal');
    }
    public repair(target: Structure<StructureConstant>): ReturnCodeSwitcher<ScreepsReturnCode> {
        return this.doSwitch(this.tower.repair(target), 'repair');
    }
    public notifyWhenAttacked(enabled: boolean): ReturnCodeSwitcher<ScreepsReturnCode> {
        return this.doSwitch(this.tower.notifyWhenAttacked(enabled), 'notifyWhenAttacked');
    }
}
