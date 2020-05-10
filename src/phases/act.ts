import { Colony } from "colony/Colony";
import * as cpuUsageEstimator from "utils/cpuUsageEstimator";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("phases.act", COLORS.phases);

export function act(colonies: { [key: string]: Colony }) {
    cpuUsageEstimator.notifyStart("phases.act");
    logger.debug(">>> ACT <<<");
    for (const colonyId in colonies) {
        if (!colonies.hasOwnProperty(colonyId)) {
            continue;
        }
        const colony = colonies[colonyId];
        logger.debug(`Executing ${colony}`);
        colony.execute();
    }
    cpuUsageEstimator.notifyComplete();
}
