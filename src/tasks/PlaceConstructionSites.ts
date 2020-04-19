import { RoomController } from "agents/controllers/RoomController";
import { BaseTask } from "tasks/ITask";
import { gridFortress } from "utils/layouts/gridFortress";
import { IBuildUnit } from "utils/layouts/renderer";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("tasks.PlaceConstructionSites", COLORS.tasks);

/**
 * Tasks for placing construction site
 * The task is complete when the layout is fully built.
 * For now only one layout is available so the task doesn't need to remember which is assigned,
 * when more layouts are available the type will need to be saved in task memory
 */
export class PlaceConstructionSites extends BaseTask<Room, RoomController> {
    private position: RoomPosition;
    private scheduledBuildUnits: IBuildUnit[] = [];

    constructor(position: RoomPosition, scheduledBuildUnits?: IBuildUnit[]) {
        super();
        this.position = position;
        this.scheduledBuildUnits = scheduledBuildUnits || [];
    }

    public execute(roomCtl: RoomController) {
        super.execute(roomCtl);

        const constructionSites = roomCtl.room.find(FIND_MY_CONSTRUCTION_SITES);
        if (constructionSites.length) {
            logger.debug("Not creating any construction sites: waiting for existing ones to be completed");
            return;
        }

        if (this.scheduledBuildUnits.length === 0) {
            this.scheduledBuildUnits = gridFortress(this.position, _.get(roomCtl, "room.controller.level", 0));
        }
        if (!this.scheduledBuildUnits.length) {
            logger.info("Layout rendering did not produce any construction unit.");
            return;
        }

        let unit = this.scheduledBuildUnits.shift();
        const failedBuildUnits: IBuildUnit[] = [];
        while (unit) {
            roomCtl
                .createConstructionSite(unit.x, unit.y, unit.structureType)
                .failure(() => {
                    failedBuildUnits.push(unit!); // can't be undefined we just called while() on it
                })
                .logFailure();

            unit = this.scheduledBuildUnits.shift();
        }

        this.scheduledBuildUnits = failedBuildUnits;
    }

    public completed() {
        return this.scheduledBuildUnits.length === 0;
    }

    public toJSON(): PlaceConstructionSitesMemory {
        return {
            type: "TASK_PLACE_CONSTRUCTION_SITES",
            executionStarted: this.executionStarted,
            anchor: this.position,
            scheduledBuildUnits: this.scheduledBuildUnits,
        };
    }

    public getType(): "TASK_PLACE_CONSTRUCTION_SITES" {
        return "TASK_PLACE_CONSTRUCTION_SITES";
    }
}
