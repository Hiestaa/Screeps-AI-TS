import { RoomController } from "agents/controllers/RoomController";
import { BaseTask } from "tasks/ITask";
import { IBuildUnit } from "utils/layouts/renderer";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("tasks.PlaceConstructionSites", COLORS.tasks);

/**
 * Tasks for placing construction site
 * The task is complete when the layout is fully built.
 * For now only one layout is available so the task doesn't need to remember which is assigned,
 * when more layouts are available the type will need to be saved in task memory
 * TODO: have this task take the layout as param, or other more dynamic form of building mechanism
 */
export class PlaceConstructionSites extends BaseTask<Room, RoomController> {
    private scheduledBuildUnits: IBuildUnit[] = [];
    private buildUnitsInProgress: IBuildUnit[] = [];

    constructor(scheduledBuildUnits: IBuildUnit[], buildUnitsInProgress?: IBuildUnit[]) {
        super();
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
                .on(ERR_RCL_NOT_ENOUGH, () => {
                    logger.warning(
                        `Unable to place ${this.renderUnitStr(
                            roomCtl,
                            unit,
                        )}: RCL is not enough. Removing from build list.`,
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
            scheduledBuildUnits: this.scheduledBuildUnits,
            buildUnitsInProgress: this.buildUnitsInProgress,
        };
    }

    public getType(): "TASK_PLACE_CONSTRUCTION_SITES" {
        return "TASK_PLACE_CONSTRUCTION_SITES";
    }
}
