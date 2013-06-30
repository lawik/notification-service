#!/usr/bin/env python

import pika
import logging
from flask import Flask, request, url_for
from flask.ext import restful
import simplejson as json
import config

app = Flask(__name__)
api = restful.Api(app)

connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))

channel = connection.channel()
for queue in config.SUPPORTED_QUEUES:
    channel.queue_declare(queue=queue, durable=True)


class RegisterEvent(restful.Resource):
    def post(self):
        validation = self.validate(request.data)

        if validation == True:
            global channel
            item = json.loads(request.data) # Practically redundant parse
                                            # See validation

            queues = item['queues']
            del(item['queues'])
            for queue in queues:
                print "Queue: "+queue
                channel.basic_publish(exchange='',
                    routing_key=queue,
                    body=json.dumps(item),
                    properties=pika.BasicProperties(
                        delivery_mode = 2, # make message persistent
                    )
                )
            return {'status': 'ok'}
        else:
            return {'status': 'error', 'error': "\n".join(validation['errors'])}

    def validate(self, data):
        valid = True
        errors = []

        item = json.loads(data) # Bad place to parse it since it is not kept
                                # and needs parsing again later

        # Validate queues
        if 'queues' not in item:
            valid = False
            errors.append('No queues field defined.')
        else:
            queues = item['queues']
            if len(queues) == 0:
                valid = False
                errors.append('No queues in queue field.')
            else:
                for queue in queues:
                    if queue not in config.SUPPORTED_QUEUES:
                        valid = False
                        errors.append('Unsupported queue received: {queue}'.format(queue=queue))

        # Validate target, optional
        if 'target' in item:
            target = item['target']
            if not isinstance(target, dict):
                valid = False
                errors.append('Type error, target field was included and was not a dict.')

        # Validate message
        if not 'message' in item:
            valid = False
            errors.append('No message field in item.')
        else:
            message = item['message']
            if not isinstance(message, dict):
                valid = False
                errors.append('Type error, message is not a dict')
            # Does not check if the message has fields...

        if not valid:
            return {'errors': errors}
        else:
            return True

api.add_resource(RegisterEvent, '/register')

if __name__ == '__main__':
    app.run(debug=config.DEBUG,port=config.PORT)
