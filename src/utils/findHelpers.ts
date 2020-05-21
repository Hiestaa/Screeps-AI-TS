const CRITICAL_DAMAGE_LVL = 1000;
/**
 * Find the most damaged creep or building nearby the given position.
 * The granularity factor controls both the complexity in terms of numbers of `find` calls,
 * and the precision in terms of damage.
 */
export function findNearbyMostDamaged(
    pos: RoomPosition,
    findType:
        | FIND_STRUCTURES
        | FIND_CREEPS
        | FIND_MY_CREEPS
        | FIND_MY_STRUCTURES
        | FIND_HOSTILE_CREEPS
        | FIND_HOSTILE_STRUCTURES,
    granularity: number,
    customFilter?: (candidate: {
        pos: RoomPosition;
        hits: number;
        hitsMax: number;
        structureType?: StructureConstant;
    }) => boolean,
) {
    const _customFilter = customFilter || (() => true);
    let target = pos.findClosestByRange(findType, {
        filter: found =>
            found.hitsMax > 0 && found.hits < found.hitsMax && found.hits < CRITICAL_DAMAGE_LVL && _customFilter(found),
    });
    if (target) {
        return target;
    }

    for (let index = 0; index < granularity; index++) {
        target = pos.findClosestByRange(findType, {
            filter: found =>
                found.hitsMax > 0 && found.hits < (index / granularity) * found.hitsMax && _customFilter(found),
        });
        if (target) {
            return target;
        }
    }

    target = pos.findClosestByRange(findType, {
        filter: found => found.hitsMax > 0 && found.hits < found.hitsMax && _customFilter(found),
    });

    return target;
}
