import { IBuildUnit, render } from "./renderer";

const RCL_LAYOUTS: { [key: number]: string } = {
    1: `
   X
    `,
    2: `
E E X E E
    C
    E   `,
    3: `
    E

ETE X E E
    C
E E E E E `,
    4: `
RRRRRRRRRRR
R    E    R
R         R
RE E E E ER
R         R
RE E X ETER
R    C    R
RE E E E ER
R         R
RE E E E ER
RRRRRRRRRRR`,
    5: `
RRRRRRRRRRR
RE E E E ER
R         R
RE E E E ER
R  E E    R
RETEEXEETER
R    C E  R
RE E E E ER
R         R
RE E E E ER
RRRRRRRRRRR`,
    6: `
RRRRRRRRRRR
RE E E E ER
RE E E E ER
RE E E E ER
R  E   E  R
RETEEXEETER
R  E C E  R
RE E E E ER
RE E E E ER
RE E E E ER
RRRRRRRRRRR`,
    7: `
RRRRRRRRRRR
RE EEEEE ER
RE E E E ER
RE E E E ER
RE E T E ER
RETEEXEETER
RE E C E ER
RE E E E ER
RE E E E ER
REEEEEEEEER
RRRRRRRRRRR`,
    8: `
RRRRRRRRRRR
RE EEEEE ER
RE E E E ER
RE E E E ER
RE E T E ER
RETEEXEETER
RE E C E ER
RE E E E ER
RE E E E ER
REEEEEEEEER
RRRRRRRRRRR`,
};

/**
 * A layout for a fortress in the form of a grid around a particular spawn.
 * This assumes the space is available around, otherwise building will be missing.
 * @param pos position of the anchor (center) of the layout in the room
 */
export function gridFortress(pos: RoomPosition, rcl: number): IBuildUnit[] {
    const layout = RCL_LAYOUTS[rcl] || RCL_LAYOUTS[0];
    return render(layout, "X", pos);
}
