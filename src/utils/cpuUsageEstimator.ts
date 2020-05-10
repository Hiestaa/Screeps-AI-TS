import { COLORS, getLogger } from "./Logger";

if (!Memory.cpuUsageEstimator) {
    Memory.cpuUsageEstimator = { enabled: false, depth: -1 };
}

const logger = getLogger("utils.cpuUsageEstimator", COLORS.utils);

interface IProcessNode {
    name: string;
    start: number;
    end?: number;
    children: IProcessNode[];
    parent?: IProcessNode;
}

class CpuUsageEstimator {
    public allProcesses: IProcessNode;
    public lastOpenProcess: IProcessNode;

    constructor() {
        this.allProcesses = {
            name: "__root__",
            start: Date.now(),
            children: [],
        };
        this.lastOpenProcess = this.allProcesses;
    }

    public notifyStart(process: string) {
        const newProcess: IProcessNode = {
            name: process,
            start: Date.now(),
            children: [],
            parent: this.lastOpenProcess,
        };
        this.lastOpenProcess.children.push(newProcess);
        this.lastOpenProcess = newProcess;
    }

    public notifyComplete() {
        this.lastOpenProcess.end = Date.now();
        if (this.lastOpenProcess.parent) {
            this.lastOpenProcess = this.lastOpenProcess.parent;
        } else {
            // FIXME: will never happen if we don't manually open the first process
            this.summary();
        }
    }

    private summary(root?: IProcessNode, depth: number = 0, parentDuration: number = 0) {
        if (Memory.cpuUsageEstimator.depth >= 0 && depth > Memory.cpuUsageEstimator.depth) {
            return;
        }
        if (!root) {
            root = this.allProcesses;
        }
        const end = root.end || Date.now();
        const start = root.start;
        const duration = end - start;
        const indent = new Array(depth * 2).fill("").join(" ");

        let str = `${indent}[${depth}][${root.name}] duration: ${duration}ms`;
        if (parentDuration) {
            const pc = (duration * 100) / parentDuration;
            str += ` ~ ${pc.toFixed(2)}%`;
        }
        logger.warning(str);

        for (const child of root.children) {
            this.summary(child, depth + 1, duration);
        }
    }
}

let estimator: CpuUsageEstimator | null = null;

export function tickStart() {
    if (!Memory.cpuUsageEstimator.enabled) {
        return;
    }
    estimator = new CpuUsageEstimator();
}

export function tickEnd() {
    if (!Memory.cpuUsageEstimator.enabled) {
        return;
    }

    if (!estimator) {
        throw new Error("No CPU usage estimator");
    }
    estimator.notifyComplete();
}

export function notifyStart(name: string) {
    if (!Memory.cpuUsageEstimator.enabled) {
        return;
    }
    if (!estimator) {
        throw new Error("No CPU usage estimator");
    }

    estimator.notifyStart(name);
}

export function notifyComplete() {
    if (!Memory.cpuUsageEstimator.enabled) {
        return;
    }
    if (!estimator) {
        throw new Error("No CPU usage estimator");
    }

    estimator.notifyComplete();
}

export function enable(depth?: number) {
    Memory.cpuUsageEstimator.enabled = true;
    Memory.cpuUsageEstimator.depth = depth !== undefined ? depth : -1;
}

export function disable() {
    Memory.cpuUsageEstimator.enabled = false;
}
