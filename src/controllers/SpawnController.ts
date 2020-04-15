import { BaseController, ReturnCodeSwitcher } from "./BaseController";

export class SpawnController extends BaseController<StructureSpawn> {
    public roomObject: StructureSpawn;
    public spawn: StructureSpawn;

    constructor(roomObject: StructureSpawn) {
        super();
        this.roomObject = roomObject;
        this.spawn = roomObject;
    }

    public spawnCreep(
        body: BodyPartConstant[],
        name: string,
        opts?: SpawnOptions | undefined,
    ): ReturnCodeSwitcher<ScreepsReturnCode> {
        return this.doSwitch(this.spawn.spawnCreep(body, name, opts), "spawnCreep");
    }
    public destroy(): ReturnCodeSwitcher<ScreepsReturnCode> {
        throw new Error("Method not implemented.");
    }
    public renewCreep(target: Creep): ReturnCodeSwitcher<ScreepsReturnCode> {
        throw new Error("Method not implemented.");
    }
    public recycleCreep(target: Creep): ReturnCodeSwitcher<ScreepsReturnCode> {
        throw new Error("Method not implemented.");
    }
}
