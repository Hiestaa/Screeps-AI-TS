import { BaseController, ReturnCodeSwitcher } from "./BaseController";

export class SpawnController extends BaseController<StructureSpawn> {
    public roomObject: StructureSpawn;
    public spawn: StructureSpawn;

    constructor(roomObject: StructureSpawn) {
        super();
        this.roomObject = roomObject;
        this.spawn = roomObject;
    }

    public availableEnergy() {
        const spawnEnergy = this.spawn.room.find(FIND_MY_SPAWNS).reduce((acc, spawn) => {
            return acc + spawn.energy;
        }, 0);

        const containers = this.spawn.room.find(FIND_STRUCTURES, {
            filter: structure => {
                return (
                    structure.structureType === STRUCTURE_CONTAINER &&
                    structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0
                );
            },
        }) as StructureContainer[];

        const containerEnergy = containers.reduce((acc, container: StructureContainer) => {
            return acc + container.store.getUsedCapacity(RESOURCE_ENERGY);
        }, 0);

        return spawnEnergy + containerEnergy;
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
