const UPDATE_STATE = {
    IDLE: 0,
    PENDING: 1,
    ERROR: 2,
    DEFINITIVE_ERROR: 3,
    FINISHED: 4,
};
const PAUSE_BETWEEN_ERRORS = [1.0, 3.0, 7.0, 60.0];

/**
 * LayerUpdateState is the update state of a layer, for a given object (e.g tile).
 * It stores information to allow smart update decisions, and especially network
 * error handling.
 * @constructor
 */
function LayerUpdateState() {
    this.state = UPDATE_STATE.IDLE;
    this.lastErrorTimestamp = 0;
    this.errorCount = 0;
    this.failureParams = [];
}
function areEquivalentFailureParams(a, b) {
    var aProps = Object.getOwnPropertyNames(a);
    var bProps = Object.getOwnPropertyNames(b);

    // If number of properties is different,
    // failure aren't equivalent
    if (aProps.length != bProps.length) {
        return false;
    }

    for (var i = 0; i < aProps.length; i++) {
        var propName = aProps[i];

        // If values of same property are not equal,
        // failure aren't equivalent
        if (a[propName] !== b[propName]) {
            return false;
        }
    }
    // failure are equivalent
    return true;
}

LayerUpdateState.prototype.canTryUpdate = function canTryUpdate(timestamp) {
    switch (this.state) {
        case UPDATE_STATE.IDLE: {
            return true;
        }
        case UPDATE_STATE.DEFINITIVE_ERROR:
        case UPDATE_STATE.PENDING:
        case UPDATE_STATE.FINISHED: {
            return false;
        }
        case UPDATE_STATE.ERROR:
        default: {
            const lastFailParams = this.lastFailureParams() || {};
            const beforeLastFailParams = this.failureParams[this.failureParams.length - 2] || {};
            // if two last Failure params aren't equivalent we can try without delay
            if (!areEquivalentFailureParams(lastFailParams, beforeLastFailParams)) {
                return true;
            }
            const errorDuration = this.secondsUntilNextTry() * 1000;
            return errorDuration <= (timestamp - this.lastErrorTimestamp);
        }
    }
};

LayerUpdateState.prototype.secondsUntilNextTry = function secondsUntilNextTry() {
    const lastFailParams = this.lastFailureParams() || {};
    const beforeLastFailParams = this.failureParams[this.failureParams.length - 2] || {};
    // if two last failure params aren't equivalent we can try without delay
    if (this.state !== UPDATE_STATE.ERROR || !areEquivalentFailureParams(lastFailParams, beforeLastFailParams)) {
        return 0;
    }
    const idx =
        Math.max(0, Math.min(this.errorCount, PAUSE_BETWEEN_ERRORS.length) - 1);

    return PAUSE_BETWEEN_ERRORS[idx];
};

LayerUpdateState.prototype.newTry = function newTry() {
    this.state = UPDATE_STATE.PENDING;
};

LayerUpdateState.prototype.success = function success() {
    this.lastErrorTimestamp = 0;
    this.state = UPDATE_STATE.IDLE;
};

LayerUpdateState.prototype.noMoreUpdatePossible = function noMoreUpdatePossible() {
    this.failureParams = undefined;
    this.state = UPDATE_STATE.FINISHED;
};

LayerUpdateState.prototype.lastFailureParams = function _lastFailureParams() {
    return this.failureParams[this.failureParams.length - 1];
};

LayerUpdateState.prototype.failure = function failure(timestamp, definitive, failureParams) {
    this.failureParams.push(failureParams);
    this.lastErrorTimestamp = timestamp;
    this.state = definitive ? UPDATE_STATE.DEFINITIVE_ERROR : UPDATE_STATE.ERROR;
    this.errorCount++;
};

LayerUpdateState.prototype.inError = function inError() {
    return this.state == UPDATE_STATE.DEFINITIVE_ERROR || this.state == UPDATE_STATE.ERROR;
};

export default LayerUpdateState;
