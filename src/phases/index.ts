import { act } from "./act";
import { reload } from "./reload";
import { save } from "./save";

export function mainLoop() {
    // tslint:disable-next-line:no-debugger
    initialize();
    const colonies = reload();
    act(colonies);
    save(colonies);
}

function initialize() {
    if (!Memory.battalions) {
        Memory.battalions = {};
    }
}
