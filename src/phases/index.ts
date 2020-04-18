import { act } from "./act";
import { initialize } from "./initialize";
import { reload } from "./reload";
import { save } from "./save";

export function mainLoop() {
    // tslint:disable-next-line:no-debugger
    // debugger;
    initialize();
    const agentStoreCollection = reload();
    act(agentStoreCollection);
    save(agentStoreCollection);
}
