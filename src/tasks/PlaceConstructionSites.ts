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
 * TODO: Implement a RoomPlanner that has an overview of the room, plan for the long-term evolution,
 * and assign PlaceConstructionSites with specific layouts at the appropriate locations.
 */
export class PlaceConstructionSites extends BaseTask<Room, RoomController> {
    private position: RoomPosition;
    private scheduledBuildUnits: IBuildUnit[] = [];
    private buildUnitsInProgress: IBuildUnit[] = [];

    constructor(position: RoomPosition, scheduledBuildUnits?: IBuildUnit[], buildUnitsInProgress?: IBuildUnit[]) {
        super();
        this.position = position;
        this.scheduledBuildUnits = scheduledBuildUnits || [];
        this.buildUnitsInProgress = buildUnitsInProgress || [];
    }

    public execute(roomCtl: RoomController) {
        super.execute(roomCtl);
        const constructionSites = roomCtl.room.find(FIND_MY_CONSTRUCTION_SITES);
        if (constructionSites.length) {
            logger.debug("Not creating any construction sites: waiting for existing ones to be completed");
            this.buildUnitsInProgress = constructionSites.map(site => ({
                x: site.pos.x,
                y: site.pos.y,
                structureType: site.structureType,
            }));
            return;
        }

        if (this.scheduledBuildUnits.length === 0) {
            this.scheduledBuildUnits = gridFortress(this.position, _.get(roomCtl, "room.controller.level", 0));
        }
        if (!this.scheduledBuildUnits.length) {
            logger.info("Layout rendering did not produce any construction unit.");
            return;
        }

        const failedBuildUnits: IBuildUnit[] = [];

        const buildUnit = (unit: IBuildUnit | undefined) => {
            if (!unit) {
                return;
            }

            roomCtl
                .createConstructionSite(unit.x, unit.y, unit.structureType)
                .on(OK, () => {
                    this.buildUnitsInProgress.push(unit!); // can't be undefined we just called while() on it
                })
                .on(ERR_INVALID_TARGET, () => {
                    logger.warning(
                        `Unable to place ${this.renderUnitStr(
                            roomCtl,
                            unit,
                        )}: invalid target. Removing from build list.`,
                    );
                })
                .failure(() => {
                    failedBuildUnits.push(unit!); // can't be undefined we just called while() on it
                })
                .logFailure();

            buildUnit(this.scheduledBuildUnits.shift());
        };

        buildUnit(this.scheduledBuildUnits.shift());

        this.scheduledBuildUnits = failedBuildUnits;

        this.buildUnitsInProgress = this.buildUnitsInProgress.filter(unit => {
            const lookAtResult = roomCtl.room.lookForAt(LOOK_CONSTRUCTION_SITES, unit.x, unit.y);
            return lookAtResult.length > 0;
        });
    }

    private renderUnitStr(roomCtl: RoomController, unit: IBuildUnit) {
        return `<a href="#!/room/${roomCtl.room.name}">[${roomCtl.room.name} ${unit.structureType} @ ${unit.x},${unit.y}]</a>`;
    }

    public completed() {
        return this.scheduledBuildUnits.length === 0 && this.buildUnitsInProgress.length === 0;
    }

    public toJSON(): PlaceConstructionSitesMemory {
        return {
            type: "TASK_PLACE_CONSTRUCTION_SITES",
            executionStarted: this.executionStarted,
            anchor: this.position,
            scheduledBuildUnits: this.scheduledBuildUnits,
            buildUnitsInProgress: this.buildUnitsInProgress,
        };
    }

    public getType(): "TASK_PLACE_CONSTRUCTION_SITES" {
        return "TASK_PLACE_CONSTRUCTION_SITES";
    }
}
