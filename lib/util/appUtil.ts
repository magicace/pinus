import * as async from 'async';
import * as log from './log';
import * as utils from './utils';
import * as path from 'path';
import * as fs from 'fs';
import * as Constants from './constants';
import * as starter from '../master/starter';
import { getLogger } from 'pomelo-logger';import { Application } from '../application';
 var logger = getLogger('pomelo', __filename);

/**
 * Initialize application configuration.
 */
export function defaultConfiguration(app)
{
    var args = parseArgs(process.argv);
    setupEnv(app, args);
    loadMaster(app);
    loadServers(app);
    processArgs(app, args);
    configLogger(app);
    loadLifecycle(app);
};

/**
 * Start servers by type.
 */
export function startByType(app, cb)
{
    if (!!app.startId)
    {
        if (app.startId === Constants.RESERVED.MASTER)
        {
            utils.invokeCallback(cb);
        } else
        {
            starter.runServers(app);
        }
    } else
    {
        if (!!app.type && app.type !== Constants.RESERVED.ALL && app.type !== Constants.RESERVED.MASTER)
        {
            starter.runServers(app);
        } else
        {
            utils.invokeCallback(cb);
        }
    }
};

/**
 * Load default components for application.
 */
export function loadDefaultComponents(app)
{
    var pomelo = require('../pomelo');
    // load system default components
    if (app.serverType === Constants.RESERVED.MASTER)
    {
        app.load(pomelo.master, app.get('masterConfig'));
    } else
    {
        app.load(pomelo.proxy, app.get('proxyConfig'));
        if (app.getCurServer().port)
        {
            app.load(pomelo.remote, app.get('remoteConfig'));
        }
        if (app.isFrontend())
        {
            app.load(pomelo.connection, app.get('connectionConfig'));
            app.load(pomelo.connector, app.get('connectorConfig'));
            app.load(pomelo.session, app.get('sessionConfig'));
            // compatible for schedulerConfig
            if (app.get('schedulerConfig'))
            {
                app.load(pomelo.pushScheduler, app.get('schedulerConfig'));
            } else
            {
                app.load(pomelo.pushScheduler, app.get('pushSchedulerConfig'));
            }
        }
        app.load(pomelo.backendSession, app.get('backendSessionConfig'));
        app.load(pomelo.channel, app.get('channelConfig'));
        app.load(pomelo.server, app.get('serverConfig'));
    }
    app.load(pomelo.monitor, app.get('monitorConfig'));
};

/**
 * Stop components.
 *
 * @param  {Array}  comps component list
 * @param  {Number}   index current component index
 * @param  {Boolean}  force whether stop component immediately
 * @param  {Function} cb
 */
export function stopComps(comps, index, force, cb)
{
    if (index >= comps.length)
    {
        utils.invokeCallback(cb);
        return;
    }
    var comp = comps[index];
    if (typeof comp.stop === 'function')
    {
        comp.stop(force, function ()
        {
            // ignore any error
            stopComps(comps, index + 1, force, cb);
        });
    } else
    {
        stopComps(comps, index + 1, force, cb);
    }
};

/**
 * Apply command to loaded components.
 * This method would invoke the component {method} in series.
 * Any component {method} return err, it would return err directly.
 *
 * @param {Array} comps loaded component list
 * @param {String} method component lifecycle method name, such as: start, stop
 * @param {Function} cb
 */
export function optComponents(comps, method, cb)
{
    var i = 0;
    async.forEachSeries(comps, function (comp, done)
    {
        i++;
        if (typeof comp[method] === 'function')
        {
            comp[method](done);
        } else
        {
            done();
        }
    }, function (err : Error)
    {
        if (err)
        {
            if (typeof err === 'string')
            {
                logger.error('fail to operate component, method: %s, err: %j', method, err);
            } else
            {
                logger.error('fail to operate component, method: %s, err: %j', method, err.stack);
            }
        }
        utils.invokeCallback(cb, err);
    });
};

/**
 * Load server info from config/servers.json.
 */
var loadServers = function (app)
{
    app.loadConfigBaseApp(Constants.RESERVED.SERVERS, Constants.FILEPATH.SERVER);
    var servers = app.get(Constants.RESERVED.SERVERS);
    var serverMap = {}, slist, i, l, server;
    for (var serverType in servers)
    {
        slist = servers[serverType];
        for (i = 0, l = slist.length; i < l; i++)
        {
            server = slist[i];
            server.serverType = serverType;
            if (server[Constants.RESERVED.CLUSTER_COUNT])
            {
                utils.loadCluster(app, server, serverMap);
                continue;
            }
            serverMap[server.id] = server;
            if (server.wsPort)
            {
                logger.warn('wsPort is deprecated, use clientPort in frontend server instead, server: %j', server);
            }
        }
    }
    app.set(Constants.KEYWORDS.SERVER_MAP, serverMap);
};

/**
 * Load master info from config/master.json.
 */
var loadMaster = function (app)
{
    app.loadConfigBaseApp(Constants.RESERVED.MASTER, Constants.FILEPATH.MASTER);
    app.master = app.get(Constants.RESERVED.MASTER);
};

function setHelp(app : Application , name : string , value : any)
{
    app.set(name , value);
    (app as any)[name] = value;
}

/**
 * Process server start command
 */
var processArgs = function (app, args)
{
    var serverType = args.serverType || Constants.RESERVED.MASTER;
    var serverId = args.id || app.getMaster().id;
    var mode = args.mode || Constants.RESERVED.CLUSTER;
    var masterha = args.masterha || 'false';
    var type = args.type || Constants.RESERVED.ALL;
    var startId = args.startId;

    setHelp(app, Constants.RESERVED.MAIN, args.main);
    setHelp(app, Constants.RESERVED.SERVER_TYPE, serverType);
    setHelp(app, Constants.RESERVED.SERVER_ID, serverId);
    setHelp(app, Constants.RESERVED.MODE, mode);
    setHelp(app, Constants.RESERVED.TYPE, type);
    if (!!startId)
    {
        setHelp(app, Constants.RESERVED.STARTID, startId);
    }

    if (masterha === 'true')
    {
        app.master = args;
        setHelp(app, Constants.RESERVED.CURRENT_SERVER, args);
    } else if (serverType !== Constants.RESERVED.MASTER)
    {
        setHelp(app, Constants.RESERVED.CURRENT_SERVER, args);
    } else
    {
        setHelp(app, Constants.RESERVED.CURRENT_SERVER, app.getMaster());
    }
};

/**
 * Setup enviroment.
 */
var setupEnv = function (app, args)
{
    setHelp(app, Constants.RESERVED.ENV, args.env || process.env.NODE_ENV || Constants.RESERVED.ENV_DEV);
};

/**
 * Configure custom logger.
 */
var configLogger = function (app)
{
    if (process.env.POMELO_LOGGER !== 'off')
    {
        var env = app.get(Constants.RESERVED.ENV);
        var originPath = path.join(app.getBase(), Constants.FILEPATH.LOG);
        var presentPath = path.join(app.getBase(), Constants.FILEPATH.CONFIG_DIR, env, path.basename(Constants.FILEPATH.LOG));
        if (fs.existsSync(originPath))
        {
            log.configure(app, originPath);
        } else if (fs.existsSync(presentPath))
        {
            log.configure(app, presentPath);
        } else
        {
            logger.error('logger file path configuration is error.');
        }
    }
};

/**
 * Parse command line arguments.
 *
 * @param args command line arguments
 *
 * @return Object argsMap map of arguments
 */
var parseArgs = function (args)
{
    var argsMap: any = {};
    var mainPos = 1;

    while (args[mainPos].indexOf('--') > 0)
    {
        mainPos++;
    }
    argsMap.main = args[mainPos];

    for (var i = (mainPos + 1); i < args.length; i++)
    {
        var arg = args[i];
        var sep = arg.indexOf('=');
        var key = arg.slice(0, sep);
        var value = arg.slice(sep + 1);
        if (!isNaN(Number(value)) && (value.indexOf('.') < 0))
        {
            value = Number(value);
        }
        argsMap[key] = value;
    }

    return argsMap;
};

/**
 * Load lifecycle file.
 *
 */
var loadLifecycle = function (app)
{
    var filePath = path.join(app.getBase(), Constants.FILEPATH.SERVER_DIR, app.serverType, Constants.FILEPATH.LIFECYCLE);
    if (!fs.existsSync(filePath))
    {
        return;
    }
    var lifecycle = require(filePath);
    for (var key in lifecycle)
    {
        if (typeof lifecycle[key] === 'function')
        {
            app.lifecycleCbs[key] = lifecycle[key];
        } else
        {
            logger.warn('lifecycle.js in %s is error format.', filePath);
        }
    }
};
