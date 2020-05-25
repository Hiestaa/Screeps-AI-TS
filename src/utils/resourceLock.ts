import { COLORS, getLogger } from "./Logger";

Memory.resourceLocks = Memory.resourceLocks || {};

Memory.resourceLocks.constructionSites = Memory.resourceLocks.constructionSites || {};
Memory.resourceLocks.structures = Memory.resourceLocks.structures || {};
Memory.resourceLocks.resources = Memory.resourceLocks.resources || {};

const logger = getLogger('utils.resourceLock', COLORS.utils);


export function lock(type: 'constructionSites' | 'structures' | 'resources', room: string, id: string, amount: number) {
    logger.info(`${room}: [${type}] locking ${amount} (id: ${id})`)
    const key = getKey(type, room, id);
    _.set(Memory, key, _.get(Memory, key, 0) + amount);
    return _.get(Memory, key, 0);
}

export function isLocked(type: 'constructionSites' | 'structures' | 'resources', room: string, id: string): number {
    const key = getKey(type, room, id);
    return _.get(Memory, key, 0);
}

export function release(type: 'constructionSites' | 'structures' | 'resources', room: string, id: string, amount: number) {
    logger.info(`${room}: [${type}] releasing ${amount} (id: ${id})`);
    const key = getKey(type, room, id);
    const remain = _.get(Memory, key, 0) - amount;
    _.set(Memory, key, 0);
    if (remain <= 0) {
        delete Memory[type][room][id];
    }
    return remain;
}

function getKey(type: 'constructionSites' | 'structures' | 'resources', room: string, id: string) {
    return `resourceLocks.${type}.${room}.${id}`;
}
