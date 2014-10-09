var tls = require('tls');
var net = require('net');
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
                // sanity checks
                if(data[0] !== 'data' && data[0] !== 'end' && data[0] !== 'open')
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
        retryReconnectTimer: 1000
    };

    for(var key in usrOptions) {
        options[key] = usrOptions[key];
    }

    // default to no tls
    var netType = net;
    if (tls)
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
        var socket;

        var connect = function(callback) {
            socket = netType.connect(options.port, options.host, options, function() {
                socket._buf = "";
                log('connected');

                socket.on('data', function(data) {
                    onData(socket, data, function(event, dataJSON) {
                        log('got msg: ["' + event + '",' + JSON.stringify(dataJSON) + ']');
                        self.emit(event, dataJSON);
                    });
                });

                self.emit('open');
            });

            var reconnectTimer;
            var reconnect = function(e) {
                if(!e)
                    e = '';
                log('reconnecting... ' + e);
                clearTimeout(reconnectTimer);
                reconnectTimer = setTimeout(connect, options.retryReconnectTimer);
            };

            socket.once('close', function() {
                reconnect('(connection closed)');
            });
            socket.once('error', function(e) {
                reconnect(e);
            });

            socket.setKeepAlive(true);
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
            socket.end();
        };
    }
}

util.inherits(netEvent, EventEmitter);

module.exports = netEvent;
