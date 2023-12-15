const { EventEmitter } = require("events")
const assert = require('assert')

module.exports = class BedrockClient extends EventEmitter {

    client

    get entityId() { return this.client.entityId }
    get startGameData() { return this.client.startGameData }
    get username() { return this.client.username }
    get options() { return this.client.options }

    constructor(options) {

        super()
        this.client = require('bedrock-protocol').createClient(options)

        var events_queue = []
        function forwardEvents(self, event, args) {

            if (false !== events_queue) {

                if (!self.client?.startGameData?.entity_id) {

                    events_queue.push(() => self.emit(event, ...args))
                    return
                }

                self.emit('load_runtime_data')

                console.log('Forwarding', events_queue.length, 'queued events')
                for (const emit of events_queue) emit()
                events_queue = false
            }

            self.emit(event, ...args)
        }

        this.client.on('kick', (packet) => this.emit('kick', packet))
        this.client.on('loggingIn', () => this.emit('loggingIn'))
        this.client.on('connect_allowed', () => this.emit('connect_allowed'))
        this.client.on('close', () => this.emit('close'))
        this.client.on('error', (err) => this.emit('error', err))

        const events = { newListener: true, removeListener: true, kick: true, loggingIn: true, connect_allowed: true, close: true, error: true }
        this.on('newListener', (event, listener) => {

            if (events[event]) return
            events[event] = true
            this.client.on(event, (...args) => forwardEvents(this, event, args))
        })
    }

    write(...args) {
        
        return this.client.write(...args)
    }

    disconnect(reason) {

        this.client.disconnect(reason)
    }

}