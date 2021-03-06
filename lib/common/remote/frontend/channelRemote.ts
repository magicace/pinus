/**
 * Remote channel service for frontend server.
 * Receive push request from backend servers and push it to clients.
 */
import * as utils from '../../../util/utils';
import { getLogger } from 'pinus-logger';
import { Application } from '../../../application';
 var logger = getLogger('pinus', __filename);

export default function(app) {
  return new ChannelRemote(app);
};

export class ChannelRemote
{
    app: Application;
    constructor(app)
    {
        this.app = app;
    };

    /**
     * Push message to client by uids.
     *
     * @param  {String}   route route string of message
     * @param  {Object}   msg   message
     * @param  {Array}    uids  user ids that would receive the message
     * @param  {Object}   opts  push options
     * @param  {Function} cb    callback function
     */
    pushMessage = utils.promisify(function (route, msg, uids, opts, cb : (err : Error | null , result ?: any)=>void)
    {
        if (!msg)
        {
            logger.error('Can not send empty message! route : %j, compressed msg : %j',
                route, msg);
            utils.invokeCallback(cb, new Error('can not send empty message.'));
            return;
        }

        var connector = this.app.components.__connector__;

        var sessionService = this.app.get('sessionService');
        var fails = [], sids = [], sessions, j, k;
        for (var i = 0, l = uids.length; i < l; i++)
        {
            sessions = sessionService.getByUid(uids[i]);
            if (!sessions)
            {
                fails.push(uids[i]);
            } else
            {
                for (j = 0, k = sessions.length; j < k; j++)
                {
                    sids.push(sessions[j].id);
                }
            }
        }
        logger.debug('[%s] pushMessage uids: %j, msg: %j, sids: %j', this.app.serverId, uids, msg, sids);
        connector.send(null, route, msg, sids, opts, function (err)
        {
            utils.invokeCallback(cb, err, fails);
        });
    });

    /**
     * Broadcast to all the client connectd with current frontend server.
     *
     * @param  {String}    route  route string
     * @param  {Object}    msg    message
     * @param  {Boolean}   opts   broadcast options. 
     * @param  {Function}  cb     callback function
     */
    broadcast = utils.promisify(function (route, msg, opts, cb : (err : Error | null , result ?: any)=>void)
    {
        var connector = this.app.components.__connector__;

        connector.send(null, route, msg, null, opts, cb);
    });
}