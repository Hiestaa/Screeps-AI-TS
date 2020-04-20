import { Colony } from "colony/Colony";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("phases.act", COLORS.phases);

export function act(colonies: { [key: string]: Colony }) {
    logger.debug(">>> ACT <<<");
    for (const colonyId in colonies) {
        if (!colonies.hasOwnProperty(colonyId)) {
            continue;
        }
        const colony = colonies[colonyId];
        logger.debug(`Executing ${colony}`);
        colony.execute();
    }
}
