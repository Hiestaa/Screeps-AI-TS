import { IBuildUnit, render } from "./renderer";

const RCL_LAYOUTS: { [key: number]: string } = {
    1: `
X
`,
    2: `
  E  C  E
 E  X
  E     E`,
    3: `
    E
   E
  E  CT E
 E  X    E
  E     E
       E
      E`,
    4: `
     E
  E E       E
E  E  OT E  E
E E  X    E E
E  E     E  E
E       E E
       E`,
    5: `
      EE      E
    E E       EE
  E  E  OT E  EE
 EE E  X    E EE
 EE  E TL  E  E
 EE       E E
  E      EE`,
    6: `
        RRRRR
        R   R
       R     R
      REE   EER
     REE     EER
   RE E       EER
 RE  E  OT E  EER
REE E  X M  E EER
REE  E TL  E  ER
REE       E ER
 REE     EER
  REE   EER
   R     R
    R   R
    RRRRR`,
    7: `
        RRRRR
        R   R
       REE EER
      REE E EER
     REE E E EER
   RE E       EER
 RE  E TOT E  EER
REE E  X M  E EER
REE  E TL  E  ER
REE     S E ER
 REE E E EER
  REE E EER
   R     R
    R   R
    RRRRR`,
    8: `
        RRRRR
        REEER
       REE EER
      REE E EER
     REE E E EER
   RE E S     EER
 RE  E TOT E  EER
REE E TX MT E EER
REE  E TLT E  ER
REE     S E ER
 REE E E EER
  REE E EER
   REE EER
    REEER
    RRRRR`,
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
