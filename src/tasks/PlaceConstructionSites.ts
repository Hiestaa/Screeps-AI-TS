import { RoomController } from "agents/controllers/RoomController";
import { BaseTask } from "tasks/BaseTask";
import { buildUnitToStr, IBuildUnit } from "utils/layouts/renderer";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("tasks.PlaceConstructionSites", COLORS.tasks);

const CAN_BE_BUILT_ON_STRUCTURES: StructureConstant[] = [STRUCTURE_RAMPART];
const DO_NOT_DESTROY: StructureConstant[] = [STRUCTURE_SPAWN, STRUCTURE_STORAGE, STRUCTURE_RAMPART];

/**
 * Tasks for placing construction site
 * The task is complete when the layout is fully built.
 * For now only one layout is available so the task doesn't need to remember which is assigned,
 * when more layouts are available the type will need to be saved in task memory
 * TODO: have this task take the layout as param, or other more dynamic form of building mechanism
 */
export class PlaceConstructionSites extends BaseTask<Room, RoomController> {
    public scheduledBuildUnits: IBuildUnit[] = [];
    public buildUnitsInProgress: IBuildUnit[] = [];
    public executionPeriod = 10;

    constructor({ scheduledBuildUnits, buildUnitsInProgress }: { scheduledBuildUnits: IBuildUnit[], buildUnitsInProgress?: IBuildUnit[] }) {
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

        const retryBuildUnits: IBuildUnit[] = [];

        const buildUnit = (unit: IBuildUnit | undefined) => {
            if (!unit) {
                return;
            }

            if (!CAN_BE_BUILT_ON_STRUCTURES.includes(unit.structureType)) {
                let destroyed = false;
                const items = roomCtl.room.lookForAt(LOOK_STRUCTURES, unit.x, unit.y);
                for (const item of items) {
                    if (item.structureType !== unit.structureType && !DO_NOT_DESTROY.includes(item.structureType)) {
                        logger.warning(
                            `${roomCtl}: destroying structure ${item} ` +
                            `to place construction site ${buildUnitToStr(unit)}`,
                        );
                        item.destroy();
                        destroyed = true;
                    }
                }

                if (items.length > 0) {
                    if (destroyed) {
                        // if we destroyed what was in the way, it's worth trying again this unit
                        retryBuildUnits.push(unit);
                    }
                    buildUnit(this.scheduledBuildUnits.shift());
                    return;
                }
            }

            roomCtl
                .createConstructionSite(unit.x, unit.y, unit.structureType)
                .on(OK, () => {
                    this.buildUnitsInProgress.push(unit);
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
                .on(ERR_INVALID_ARGS, () => {
                    logger.warning(
                        `Unable to place ${this.renderUnitStr(
                            roomCtl,
                            unit,
                        )}: Invalid arguments. Removing from build list.`,
                    );
                })
                .failure(() => {
                    retryBuildUnits.push(unit);
                })
                .logFailure();

            buildUnit(this.scheduledBuildUnits.shift());
        };

        buildUnit(this.scheduledBuildUnits.shift());

        this.scheduledBuildUnits = retryBuildUnits;

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
            executionPaused: this.executionPaused,
            scheduledBuildUnits: this.scheduledBuildUnits,
            buildUnitsInProgress: this.buildUnitsInProgress,
        };
    }

    public getType(): "TASK_PLACE_CONSTRUCTION_SITES" {
        return "TASK_PLACE_CONSTRUCTION_SITES";
    }

    public visualize(roomName: string) {
        const COLOR = "orange";
        let prevBuildUnit = null;
        for (const buildUnit of this.scheduledBuildUnits) {
            const roomVisual = new RoomVisual(roomName);
            if (
                prevBuildUnit !== null &&
                (prevBuildUnit.structureType === STRUCTURE_ROAD || buildUnit.structureType === STRUCTURE_ROAD)
            ) {
                roomVisual.line(prevBuildUnit.x, prevBuildUnit.y, buildUnit.x, buildUnit.y, {
                    color: COLOR,
                    width: 0.15,
                    lineStyle: "dotted",
                    opacity: 0.1,
                });
            }
            if (buildUnit.structureType === STRUCTURE_ROAD) {
                roomVisual.circle(buildUnit.x, buildUnit.y, {
                    radius: 0.1,
                    fill: COLOR,
                    opacity: 0.1,
                });
            } else {
                roomVisual.rect(buildUnit.x - 0.2, buildUnit.y - 0.2, 0.4, 0.4, {
                    fill: COLOR,
                    opacity: 0.2,
                });
            }
            prevBuildUnit = buildUnit;
        }
    }
}
