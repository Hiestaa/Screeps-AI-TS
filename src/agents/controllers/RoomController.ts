import { BaseController, ReturnCodeSwitcher } from "./BaseController";

export class RoomController extends BaseController<Room> {
    public roomObject: Room;
    public room: Room;

    constructor(roomObject: Room) {
        super();
        this.roomObject = roomObject;
        this.room = roomObject;
    }
    public createConstructionSite(
        x: number | RoomPosition | _HasRoomPosition,
        y: number | BuildableStructureConstant,
        structureType?: BuildableStructureConstant,
    ): ReturnCodeSwitcher<ScreepsReturnCode> {
        if (typeof x === "number" && typeof y === "number" && structureType) {
            return this.doSwitch(this.room.createConstructionSite(x, y, structureType), "createConstructionSite");
        } else if (!(typeof x === "number") && !(typeof y === "number")) {
            return this.doSwitch(this.room.createConstructionSite(x, y), "createConstructionSite");
        } else {
            // TODO: add support for providing the name as third parameter if the first and second is 'spawn'
            // TODO: add support for providing the name as fourth parameter if the first and second are numbers and the third is 'spawn'
            // If that's not possible (due to the inability to discriminate between 'spawn' being a name (string) and 'spawn' being a type (structure))
            // consider making a `createSpawnConstructionSite` function

            throw new Error("Invalid parameter types");
        }
    }
    // createFlag(x: number, y: number, name?: string | undefined, color?: 1 | 2 | 4 | 3 | 5 | 6 | 7 | 8 | 9 | 10 | undefined, secondaryColor?: 1 | 2 | 4 | 3 | 5 | 6 | 7 | 8 | 9 | 10 | undefined): string | -3 | -10;
    // createFlag(pos: RoomPosition | { pos: RoomPosition; }, name?: string | undefined, color?: 1 | 2 | 4 | 3 | 5 | 6 | 7 | 8 | 9 | 10 | undefined, secondaryColor?: 1 | 2 | 4 | 3 | 5 | 6 | 7 | 8 | 9 | 10 | undefined): string | -3 | -10;
    // createFlag(x: any, y?: any, name?: any, color?: any, secondaryColor?: any) {
    //     throw new Error("Method not implemented.");
    // }
    // findExitTo(room: string | Room): 1 | -2 | 3 | 5 | 7 | -10 {
    //     throw new Error("Method not implemented.");
    // }
}
