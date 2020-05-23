Memory.bookings = Memory.bookings || {};

Memory.bookings.constructionSites = Memory.bookings.constructionSites || {};
Memory.bookings.structures = Memory.bookings.structures || {};
Memory.bookings.resources = Memory.bookings.resources || {};

export function book(type: 'constructionSites' | 'structures' | 'resources', room: string, id: string, amount: number) {
    const key = `${type}.${room}.${id}`;
    _.set(Memory, key, _.get(Memory, key, 0) + amount);
}

export function isBooked(type: 'constructionSites' | 'structures' | 'resources', room: string, id: string): number {
    const key = `${type}.${room}.${id}`;
    return _.get(Memory, key, 0);
}
