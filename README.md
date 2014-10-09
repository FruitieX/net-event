net-event
=========

easily extend node net/tls modules with events

Usage examples
--------------

#### Client ####
    var netEvent = require('net-event');
    var socket = new netEvent({
        host: 'localhost',
        port: 8080
    });
    socket.on('helloResponse', function(data) {
        console.log('got JSON data: ' + JSON.stringify(data));
    });

#### Server ####
    var netEvent = require('net-event');
    var server = new netEvent({
        server: true,
        port: 8080
    });
    server.on('open', function(socket) {
        socket.send('helloResponse', {
            'text': 'Hello World!'
        });
    });

See the provided `example_server.js` and `example_client.js` programs
for more detailed examples.

Examples can be tested by running:
* ./gen_cert.sh
* node example_server.js
* node example_client.js

Note that unlike in the examples, your code should `require('net-event')`

Protocol
--------

    msg_len["eventname",JSON]

Example:

    37["helloTest",{"text":"Hello world!"}]
