net-event
=========

easily extend node net/tls modules with events

Usage examples
--------------

See the provided `example_server.js` and `example_client.js` programs.

Examples can be tested by running:
* ./gen_cert.sh
* node example_server.js
* node example_client.js

Note that unlike in the examples, your code should `require('net-event')`

Protocol
--------

`msg_len["eventname",JSON]`

Example: `37["helloTest",{"text":"Hello world!"}]`
