"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const utils = require("../../util/utils");
const Loader = require("pinus-loader");
const pathUtil = require("../../util/pathUtil");
const pinus_logger_1 = require("pinus-logger");
var logger = pinus_logger_1.getLogger('pinus', __filename);
var forwardLogger = pinus_logger_1.getLogger('forward-log', __filename);
/**
 * Handler service.
 * Dispatch request to the relactive handler.
 *
 * @param {Object} app      current application context
 */
class HandlerService {
    constructor(app, opts) {
        this.handlerMap = {};
        this.name = 'handler';
        this.app = app;
        if (!!opts.reloadHandlers) {
            watchHandlers(app, this.handlerMap);
        }
        this.enableForwardLog = opts.enableForwardLog || false;
    }
    ;
    /**
     * Handler the request.
     */
    handle(routeRecord, msg, session, cb) {
        // the request should be processed by current server
        var handler = this.getHandler(routeRecord);
        if (!handler) {
            logger.error('[handleManager]: fail to find handler for %j', msg.__route__);
            utils.invokeCallback(cb, new Error('fail to find handler for ' + msg.__route__));
            return;
        }
        var start = Date.now();
        var self = this;
        var callback = function (err, resp, opts) {
            if (self.enableForwardLog) {
                var log = {
                    route: msg.__route__,
                    args: msg,
                    time: utils.format(new Date(start)),
                    timeUsed: Date.now() - start
                };
                forwardLogger.info(JSON.stringify(log));
            }
            // resp = getResp(arguments);
            utils.invokeCallback(cb, err, resp, opts);
        };
        var method = routeRecord.method;
        if (!Array.isArray(msg)) {
            handler[method](msg, session).then((resp) => {
                callback(null, resp);
            }, (reason) => {
                callback(reason);
            });
        }
        else {
            msg.push(session);
            handler[method].apply(handler, msg).then((resp) => {
                callback(null, resp);
            }, (reason) => {
                callback(reason);
            });
        }
        return;
    }
    ;
    /**
     * Get handler instance by routeRecord.
     *
     * @param  {Object} handlers    handler map
     * @param  {Object} routeRecord route record parsed from route string
     * @return {Object}             handler instance if any matchs or null for match fail
     */
    getHandler(routeRecord) {
        var serverType = routeRecord.serverType;
        if (!this.handlerMap[serverType]) {
            loadHandlers(this.app, serverType, this.handlerMap);
        }
        var handlers = this.handlerMap[serverType] || {};
        var handler = handlers[routeRecord.handler];
        if (!handler) {
            logger.warn('could not find handler for routeRecord: %j', routeRecord);
            return null;
        }
        if (typeof handler[routeRecord.method] !== 'function') {
            logger.warn('could not find the method %s in handler: %s', routeRecord.method, routeRecord.handler);
            return null;
        }
        return handler;
    }
    ;
}
exports.HandlerService = HandlerService;
/**
 * Load handlers from current application
 */
var loadHandlers = function (app, serverType, handlerMap) {
    var p = pathUtil.getHandlerPath(app.getBase(), serverType);
    if (p) {
        handlerMap[serverType] = Loader.load(p, app);
    }
};
var watchHandlers = function (app, handlerMap) {
    var p = pathUtil.getHandlerPath(app.getBase(), app.serverType);
    if (!!p) {
        fs.watch(p, function (event, name) {
            if (event === 'change') {
                handlerMap[app.serverType] = Loader.load(p, app);
            }
        });
    }
};
var getResp = function (args) {
    var len = args.length;
    if (len == 1) {
        return [];
    }
    if (len == 2) {
        return [args[1]];
    }
    if (len == 3) {
        return [args[1], args[2]];
    }
    if (len == 4) {
        return [args[1], args[2], args[3]];
    }
    var r = new Array(len);
    for (var i = 1; i < len; i++) {
        r[i] = args[i];
    }
    return r;
};
//# sourceMappingURL=handlerService.js.map