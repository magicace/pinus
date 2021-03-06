"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Filter for statistics.
 * Record used time for each request.
 */
const pinus_logger_1 = require("pinus-logger");
var conLogger = pinus_logger_1.getLogger('con-log', __filename);
const utils = require("../../util/utils");
function default_1() {
    return new TimeFilter();
}
exports.default = default_1;
;
class TimeFilter {
    before(msg, session, next) {
        session.__startTime__ = Date.now();
        next();
    }
    ;
    after(err, msg, session, resp, next) {
        var start = session.__startTime__;
        if (typeof start === 'number') {
            var timeUsed = Date.now() - start;
            var log = {
                route: msg.__route__,
                args: msg,
                time: utils.format(new Date(start)),
                timeUsed: timeUsed
            };
            conLogger.info(JSON.stringify(log));
        }
        next(err);
    }
    ;
}
exports.TimeFilter = TimeFilter;
//# sourceMappingURL=time.js.map