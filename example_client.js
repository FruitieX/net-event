#!/usr/bin/env node

// example client program
var netEvent = require('./net-event');
var fs = require('fs');

var options = {
    host: 'localhost',
    port: 8080,

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

    // verify server certificate against ca
    rejectUnauthorized: true
};

var socket = new netEvent(options);

socket.on('helloResponse', function(data) {
    console.log('got JSON data: ' + JSON.stringify(data));
});
socket.on('open', function() {
    socket.send('helloTest', {
        'text': 'Hello world!'
    });
});
socket.on('end', function() {
    console.log('Connection to server lost');
});
