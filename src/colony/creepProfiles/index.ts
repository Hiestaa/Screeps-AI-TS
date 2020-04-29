import { BaseCreepProfile } from "./BaseCreepProfile";
import { GeneralPurpose } from "./GeneralPurpose";
import { Harvester } from "./Harvester";
import { Hauler } from "./Hauler";
import { Warrior } from "./Warrior";
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
        case "M-Attacker":
            return new Warrior("attack");
        case "R-Attacker":
            return new Warrior("ranged_attack");
        case "Healer":
            return new Warrior("heal");
    }
}
