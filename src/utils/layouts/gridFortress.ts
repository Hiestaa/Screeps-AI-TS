import { IBuildUnit, render } from "./renderer";

/**
 * A layout for a fortress in the form of a grid around a particular spawn.
 * This assumes the space is available around, otherwise building will be missing.
 * @param pos position of the anchor (center) of the layout in the room
 */
export function gridFortress(pos: RoomPosition): IBuildUnit[] {
    return render(
        `
RRRRRRRRRRR
RE.E E E ER
RE.E E E ER
RECE E ECER
RETE X ETERC
RECE E ECER
RE E E E ER
RE E E E ER
RRRRRRRRRRR`,
        "X",
        pos,
    );
}
