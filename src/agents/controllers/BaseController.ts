import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("controllers.BaseController", COLORS.controllers);

export type Controllable = RoomObject | Room;

/**
 * Base class for any controller
 * A controller is a low-level wrapper around a room object of any kind.
 * It offers additional methods to facilitate the manipulation of that room object.
 */
export abstract class BaseController<RoomObjectType extends Controllable> {
    public abstract roomObject: RoomObjectType;

    public toString() {
        return `controller for ${this.roomObject}`;
    }

    protected doSwitch<Code extends ScreepsReturnCode>(code: Code, action: string) {
        return new ReturnCodeSwitcher<Code>(code)
            ._on(ERR_BUSY, () => logger.debug(`${this} did not perform ${action} because it is busy`))
            ._on(ERR_TIRED, () => logger.debug(`${this} did not perform ${action} because it is tired`))
            .failure((_code: Code) => logger.failure(_code, `${this}: Unable to perform action ${action}`));
    }
}

/**
 * Utility to facilitate doing a switch over the resulting values of a creep action.
 * This object will wrap the return code of a particular action to offer some handy shortcuts.
 */
export class ReturnCodeSwitcher<Code extends ScreepsReturnCode> {
    public code: Code;
    public checkedValues: Set<ScreepsReturnCode>;
    public failCallback: Array<(code: Code) => void> = [];

    constructor(code: Code) {
        this.code = code;
        this.checkedValues = new Set<ScreepsReturnCode>();
    }

    /**
     * Add a handler function for a particular response code
     * As many callback as desired can be added to the same response code. Each callback is executed immediately.
     * Once a particular response code value is checked, it won't trigger a call to the failure callbacks.
     *
     * @param code return code of the executed action
     * @param callback callback to execute if the executed action return code matches the provided one
     */
    public on(code: Code, callback: () => void) {
        this.checkedValues.add(code);
        if (this.code === code) {
            callback();
        }
        return this;
    }

    /**
     * Add a handler function for a particular response code
     * This is to be used internally to add generic callback to specific return code
     * that may not match one of the expected ones
     *
     * @param code possible return code of the executed action
     * @param callback callback to execute if the executed action return code matches the provided one
     */
    public _on(code: ScreepsReturnCode, callback: () => void) {
        this.checkedValues.add(code);
        if (this.code === code) {
            callback();
        }
        return this;
    }

    /**
     * Add a success callback - handy shortcut for `on(OK, callback)`
     * @param callback callback to execute in case of success
     */
    public success(callback: () => void) {
        if (this.code === OK) {
            callback();
        }
        return this;
    }

    /**
     * Add a failure callback to be called on when calling `logFailure`.
     * The callback will be called in case of
     * * non-OK return code, AND
     * * the returned code has not matched any of the provided callbacks
     * @param callback callback to execute in case of failure
     */
    public failure(callback: (code: Code) => void) {
        this.failCallback.push(callback);
        return this;
    }

    /**
     * Trigger the failure callback calls.
     */
    public logFailure() {
        if (this.code !== OK && !this.checkedValues.has(this.code)) {
            this.failCallback.forEach(cb => {
                cb(this.code);
            });
        }
    }
}
