import { Harvester } from "./Harvester";
import { Hauler } from "./Hauler";
import { Worker } from "./Worker";

export function makeCreepProfileInstance(type: CREEP_PROFILE | undefined, availableEnergy: number) {
    switch (type) {
        case "Harvester":
            return new Harvester(availableEnergy);
        case "Hauler":
            return new Hauler(availableEnergy);
        case "Worker":
            return new Worker(availableEnergy);
        default:
            return undefined;
    }
}
