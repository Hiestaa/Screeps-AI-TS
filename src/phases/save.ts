import { Colony } from "colony/Colony";
import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("phases.save", COLORS.phases);

export function save(colonies: { [key: string]: Colony }) {
    logger.debug(">>> SAVE <<<");
    for (const colonyId in colonies) {
        if (!colonies.hasOwnProperty(colonyId)) {
            continue;
        }
        const colony = colonies[colonyId];
        logger.debug(`Saving ${colony}`);
        colony.save();
    }
}
