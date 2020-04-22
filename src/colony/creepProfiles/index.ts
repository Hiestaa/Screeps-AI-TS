import { BaseCreepProfile } from "./BaseCreepProfile";
import { GeneralPurpose } from "./GeneralPurpose";
import { Harvester } from "./Harvester";
import { Hauler } from "./Hauler";
import { Worker } from "./Worker";

export function makeCreepProfileInstance(type: CREEP_PROFILE): BaseCreepProfile {
    switch (type) {
        case "Harvester":
            return new Harvester();
        case "Hauler":
            return new Hauler();
        case "Worker":
            return new Worker();
        case "GeneralPurpose":
            return new GeneralPurpose();
    }
}
