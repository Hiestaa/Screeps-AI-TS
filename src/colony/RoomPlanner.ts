import { RoomAgent } from "agents/RoomAgent";
import { SpawnAgent } from "agents/SpawnAgent";
import { PlaceConstructionSites } from "tasks/PlaceConstructionSites";

export class RoomPlanner {
    public room: RoomAgent;
    public spawns: { [key: string]: SpawnAgent };

    constructor(room: RoomAgent, spawns: { [key: string]: SpawnAgent }) {
        this.room = room;
        this.spawns = spawns;
    }

    public execute() {
        const controllerLevel = this.room.hasControllerLevelChanged();
        if (controllerLevel) {
            this.createSpawnFortress();
        }
    }

    public createSpawnFortress() {
        for (const spawnName in this.spawns) {
            if (!this.spawns.hasOwnProperty(spawnName)) {
                continue;
            }

            const spawnAgent = this.spawns[spawnName];
            if (spawnAgent.spawnController) {
                this.room.scheduleTask(new PlaceConstructionSites(spawnAgent.spawnController.spawn.pos));
            }
        }
    }
}
