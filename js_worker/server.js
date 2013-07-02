var io = require('socket.io').listen(1281)
var amqp = require('amqp')

var connection = amqp.createConnection({ host: '127.0.0.1' });

var identified_clients = {};

connection.on('ready', function(){
    //var exchange = connection.exchange('');
    console.log("Connection ready...");
        connection.queue('notify_js', {passive: true, durable: true}, function(queue) {
            queue.bind('#');
            console.log("Selected queue.");

            io.sockets.on('connection', function(client){
                console.log("Client connected.");
                console.log(client);
                client.on('identify', function(key, value) {
                    console.log("Client identified.");
                    console.log(key +': '+value);
                    identified_clients[key+'---'+value] = {
                        client: client,
                        key: key,
                        value: value
                    };
                });
            });

            queue.subscribe( {ack: true}, function (message) {
                console.log("Message:");
                console.log(message);
                item = JSON.parse(message);
                console.log(item);
                queue.shift();
            });
        });
});
