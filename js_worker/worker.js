var io = require('socket.io').listen(1281, {
    transports: ['websocket']
});
var amqp = require('amqp');

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
                client.emit('identify');
                client.on('identify', function(data) {
                    console.log(data);
                    client.set('key', data.key);
                    client.set('value', data.value);
                    console.log("Client identified.");
                    console.log(data);
                    var key = '';
                    var value = '';
                    identified_clients[key+'---'+value] = {
                        client: client,
                        key: data.key,
                        value: data.value
                    };
                });

                client.on('disconnect', function () {
                    console.log('Disconnected client');
                    client.get('key', function (err, key) {
                        client.get('value', function (err, value) {
                            console.log('Deleting any identified client');
                            delete(identified_clients[key+'---'+value]);
                        });
                    });
                });
            });

            queue.subscribe( {ack: true}, function (message) {
                item = JSON.parse(message.data);
                send_message(item);
                queue.shift();
            });
        });
});

function send_message(message) {
    console.log("Sending message...");
    console.log("Checking for clients.");
    var target = message.target;
    var event = message.message['event'];
    console.log(target);
    console.log(identified_clients);
    if(event == undefined) {
        event = 'default';
    }
    console.log(event);
    for(var i in identified_clients) {
        var client = identified_clients[i];
        if(target[client.key] != undefined && target[client.key] == client.value) {
            console.log("Identified client. Sending to: ");
            console.log(client);
            client.client.emit(event, message.message);
        }
    }
}

