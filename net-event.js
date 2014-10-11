var tls = require('tls');
var net = require('net');
var dns = require('dns');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var onData = function(socket, data, emitter) {
    // message format is assumed to be:
    // 1234["string", {...}]
    // where 1234 is message length
    socket._buf += data.toString();

    // loop to check all messages;
    // we might have received multiple msgs into the buffer
    while(true) {
        // recv'd the msg length integer if we have a '[' char
        var msgLenEnd = socket._buf.indexOf('[');
        if(msgLenEnd !== -1) {
            var len = parseInt(socket._buf.substr(0, msgLenEnd));
            var msg = socket._buf.substr(msgLenEnd, len);

            // got entire msg?
            if(msg.length == len) {
                // remove msg from buffer, then handle it
                socket._buf = socket._buf.substr(msgLenEnd + len);

                data = JSON.parse(msg);

                if(data[0] === '_ne_ping')
                    socket.send('_ne_pong');

                // sanity checks
                else if(data[0] !== 'data' && data[0] !== 'end' && data[0] !== 'open')
                    emitter(data[0], data[1]);
            // exit and wait for more data
            } else {
                break;
            }
        // exit and wait for more data
        } else {
            break;
        }
    }
};

var netEvent = function(usrOptions) {
    // default options
    var options = {
        reconnectDelay: 1000,
        timeout: 20000,
        keepalive: 5000
    };

    for(var key in usrOptions) {
        options[key] = usrOptions[key];
    }

    // default to no tls
    var netType = net;
    if (options.tls)
        netType = tls;

    var self = this;

    var log = function(msg) {
        if(options.debug)
            console.log('netEvent DEBUG: ' + msg);
    };

    // server specific code
    if(options.server) {
        var sockets = [];
        var server = netType.createServer(options, function(socket) {
            log('client connected');

            sockets.push(socket);
            self.emit('open', socket);

            socket._buf = "";
            socket.on('data', function(data) {
                onData(socket, data, function(event, dataJSON) {
                    log('got msg: ["' + event + '",' + JSON.stringify(dataJSON) + ']');
                    socket.emit(event, dataJSON);
                });
            });
            socket.send = function(evt, data) {
                data = JSON.stringify([evt, data]);
                socket.write(data.length.toString());
                socket.write(data);
                log('sent msg: ' + data);
            };
            socket.broadcast = function(evt, data, ignoreSelf) {
                for(var i = 0; i < sockets.length; i++) {
                    if(!ignoreSelf || sockets[i] !== socket) {
                        sockets[i].send(evt, data);
                    }
                }
            };
            socket.on('end', function() {
                log('client disconnected');

                if(sockets.indexOf(socket) !== -1)
                    sockets.splice(sockets.indexOf(socket), 1);
            });
        });

        server.listen(options.port);
    }

    // client specific code
    else {
        var socket, pingTimeout, reconnectDelay, socketTimeout;

        var connect = function(callback) {
            log('connecting...');

            var socketCreate = function(port, addr) {
                socket = netType.connect(port, addr, options, function() {
                    clearTimeout(reconnectDelay);

                    socket._buf = "";
                    log('connected');

                    socket.on('data', function(data) {
                        onData(socket, data, function(event, dataJSON) {
                            resetPingTimeout();
                            resetSocketTimeout();
                            log('got msg: ["' + event + '",' + JSON.stringify(dataJSON) + ']');
                            self.emit(event, dataJSON);
                        });
                    });

                    self.emit('open');

                    // start pinging on inactivity
                    resetPingTimeout();
                });

                socket.once('close', function() {
                    self.emit('end');
                    reconnect('(connection closed)');
                });
                socket.once('error', function(e) {
                    self.emit('error', e);
                    reconnect('(' + e + ')');
                });
            };

            if(net.isIP(options.host)) {
                socketCreate(options.port, options.host);
            } else {
                dns.resolve(options.host, function(err, addrs) {
                    if(err)
                        log('error on dns lookup: ' + err);
                    else {
                        socketCreate(options.port, addrs[0]);
                    }
                });
            }

            // send ping at inactivity to check connection is up
            var resetPingTimeout = function() {
                clearTimeout(pingTimeout);
                pingTimeout = setTimeout(function() {
                    self.send('_ne_ping');
                }, options.keepalive);
            };

            // time connection out after long inactivity
            var resetSocketTimeout = function() {
                clearTimeout(socketTimeout);
                socketTimeout = setTimeout(function() {
                    reconnect();
                }, options.timeout);
            };

            clearTimeouts = function() {
                clearTimeout(pingTimeout);
                clearTimeout(reconnectDelay);
                clearTimeout(socketTimeout);
            };

            // start timeout timer
            resetSocketTimeout();

            var reconnect = function(e) {
                if(!e)
                    e = '';

                if(socket) {
                    socket.removeAllListeners('close');
                    socket.removeAllListeners('error');
                    socket.destroy();
                }

                log('reconnecting in ' + options.reconnectDelay + 'ms... ' + e);
                clearTimeouts();
                reconnectDelay = setTimeout(connect, options.reconnectDelay);
            };
        };

        connect();

        self.send = function(evt, data) {
            data = JSON.stringify([evt, data]);
            socket.write(data.length.toString());
            socket.write(data);
            log('sent msg: ' + data);
        };
        self.close = function() {
            socket.removeAllListeners('close');
            socket.removeAllListeners('error');
            clearTimeouts();
            socket.end();
        };
    }
}

util.inherits(netEvent, EventEmitter);

module.exports = netEvent;
