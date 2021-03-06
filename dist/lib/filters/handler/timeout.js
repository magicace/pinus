"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Filter for timeout.
 * Print a warn information when request timeout.
 */
const pinus_logger_1 = require("pinus-logger");
var logger = pinus_logger_1.getLogger('pinus', __filename);
const utils = require("../../util/utils");
var DEFAULT_TIMEOUT = 3000;
var DEFAULT_SIZE = 500;
function default_1(timeout, maxSize) {
    return new TimeoutFilter(timeout || DEFAULT_TIMEOUT, maxSize || DEFAULT_SIZE);
}
exports.default = default_1;
;
class TimeoutFilter {
    constructor(timeout, maxSize) {
        this.timeout = timeout;
        this.maxSize = maxSize;
        this.timeouts = {};
        this.curId = 0;
        this.timeout = timeout;
        this.maxSize = maxSize;
    }
    ;
    before(msg, session, next) {
        var count = utils.size(this.timeouts);
        if (count > this.maxSize) {
            logger.warn('timeout filter is out of range, current size is %s, max size is %s', count, this.maxSize);
            next();
            return;
        }
        this.curId++;
        this.timeouts[this.curId] = setTimeout(function () {
            logger.error('request %j timeout.', msg.__route__);
        }, this.timeout);
        session.__timeout__ = this.curId;
        next();
    }
    ;
    after(err, msg, session, resp, next) {
        var timeout = this.timeouts[session.__timeout__];
        if (timeout) {
            clearTimeout(timeout);
            delete this.timeouts[session.__timeout__];
        }
        next(err);
    }
    ;
}
exports.TimeoutFilter = TimeoutFilter;
//# sourceMappingURL=timeout.js.map