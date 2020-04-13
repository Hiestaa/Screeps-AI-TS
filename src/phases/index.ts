import { act } from "./act";
import { initialize } from "./initialize";
import { reload } from "./reload";
import { save } from "./save";

export function mainLoop() {
    // tslint:disable-next-line:no-debugger
    // debugger;
    initialize();
    const [controllerStore, objective] = reload();
    const newObjective = act(controllerStore, objective);
    save(controllerStore, newObjective);
}
