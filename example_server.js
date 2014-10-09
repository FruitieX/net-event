#!/usr/bin/env node

// example server program
var netEvent = require('./net-event');
var fs = require('fs');

var options = {
    // listen port
    port: 8080,

    // we are a server
    server: true,

    // print debug messages (sends/recvs logged)
    debug: true,

    // use tls. options below only needed if using tls
    tls: true,

    // same key used for both server, client and ca
    // server verifies client cert against ca
    // this may or may not be what you want to do in your app
    key: fs.readFileSync(__dirname + '/example-key.pem'),
    cert: fs.readFileSync(__dirname + '/example-cert.pem'),
    ca: fs.readFileSync(__dirname + '/example-cert.pem'),

    // verify client certificate against ca
    requestCert: true,
    rejectUnauthorized: true
};

var server = new netEvent(options);

server.on('open', function(socket) {
    socket.on('helloTest', function(data) {
        console.log('got JSON data: ' + JSON.stringify(data));
        socket.send('helloResponse', {
            'text': 'Hello there!'
        });
    });
    socket.on('end', function() {
        console.log('client disconnected');
    });
});
