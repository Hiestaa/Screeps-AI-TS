import { COLORS, getLogger } from "./Logger";

Memory.resourceLocks = Memory.resourceLocks || {};

Memory.resourceLocks.constructionSites = Memory.resourceLocks.constructionSites || {};
Memory.resourceLocks.structures = Memory.resourceLocks.structures || {};
Memory.resourceLocks.resources = Memory.resourceLocks.resources || {};
Memory.resourceLockers = Memory.resourceLockers || {};

const logger = getLogger("utils.resourceLock", COLORS.utils);

export function lock(
    type: "constructionSites" | "structures" | "resources",
    room: string,
    id: string,
    amount: number,
    actor: string,
) {
    logger.debug(`${room}: [${type}] locking ${amount} (on id: ${id}, by ${actor})`);
    if (_.get(Memory, actor, 0) > 0) {
        logger.warning(`Actor ${actor}: attempt to lock more resources before releasing lock.`);
    }
    const key = getKey(type, room, id);
    _.set(Memory, key, _.get(Memory, key, 0) + amount);
    Memory.resourceLockers[actor] = Memory.resourceLockers[actor] || {};
    Memory.resourceLockers[actor][id] = (Memory.resourceLockers[actor][id] || 0) + amount;
    return _.get(Memory, key, 0);
}

export function isLocked(type: "constructionSites" | "structures" | "resources", room: string, id: string): number {
    const key = getKey(type, room, id);
    return _.get(Memory, key, 0);
}

export function release(
    type: "constructionSites" | "structures" | "resources",
    room: string,
    id: string,
    amount: number,
    actor: string,
) {
    logger.debug(`${room}: [${type}] releasing ${amount} (id: ${id}, by ${actor})`);
    const key = getKey(type, room, id);
    const remain = _.get(Memory, key, 0) - amount;
    _.set(Memory, key, remain);
    if (remain <= 0 && _.get(Memory, key, "none") !== "none") {
        logger.debug(`${room}: [${type}] no more lock on id: ${id}`);
        delete Memory.resourceLocks[type][room][id];
    }
    if (Memory.resourceLockers[actor] && Memory.resourceLockers[actor][id]) {
        Memory.resourceLockers[actor][id] -= amount;
        if (Memory.resourceLockers[actor][id] === 0) {
            delete Memory.resourceLockers[actor][id];
        }
        if (Object.keys(Memory.resourceLockers[actor]).length === 0) {
            delete Memory.resourceLockers[actor];
        }
    } else {
        logger.warning(`Actor ${actor}: attempt to release resources on ${id} that have not been locked`);
    }
    return remain;
}

function getKey(type: "constructionSites" | "structures" | "resources", room: string, id: string) {
    return `resourceLocks.${type}.${room}.${id}`;
}
