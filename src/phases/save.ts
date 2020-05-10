import { Colony } from "colony/Colony";
import * as cpuUsageEstimator from "utils/cpuUsageEstimator";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("phases.save", COLORS.phases);

export function save(colonies: { [key: string]: Colony }) {
    cpuUsageEstimator.notifyStart("phases.save");
    logger.debug(">>> SAVE <<<");
    for (const colonyId in colonies) {
        if (!colonies.hasOwnProperty(colonyId)) {
            continue;
        }
        const colony = colonies[colonyId];
        logger.debug(`Saving ${colony}`);
        colony.save();
    }
    cpuUsageEstimator.notifyComplete();
}
