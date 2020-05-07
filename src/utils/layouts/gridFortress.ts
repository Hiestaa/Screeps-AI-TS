import { IBuildUnit, render } from "./renderer";

const RCL_LAYOUTS: { [key: number]: string } = {
    1: `
X
`,
    2: `
 E
EEX
EE C
`,
    3: `
  E T
EEEX  EEE
 EE C E
`,
    4: `
  E   E
EEE T EEE
EEEX  EEE
EEE C EEE
`,
    5: `
RRRRRRRRRRR
R         R
R         R
REEE   EEER
REEE T EEER
REEEX  EEER
REEE C EEER
REEE   EEER
R         R
R         R
RRRRRRRRRRR`,
    6: `
RRRRRRRRRRR
R         R
R    E    R
REEE E EEER
REEE T EEER
REEEX  EEER
REEE C EEER
REEE E EEER
REEE E EEER
R         R
RRRRRRRRRRR`,
    7: `
RRRRRRRRRRR
REEE E    R
REEE E EEER
REEE E EEER
REEE T EEER
REEEX SEEER
REEE C EEER
REEE E EEER
REEE E EEER
R         R
RRRRRRRRRRR`,
    8: `
RRRRRRRRRRR
REEE E EEER
REEE E EEER
REEE E EEER
REEE T EEER
REEEX SEEER
REEE C EEER
REEE E EEER
REEE E EEER
REEE E EEER
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
