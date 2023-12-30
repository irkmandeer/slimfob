
const assert = require('assert')

module.exports = (bot) => {

    const Container = require('./container')(bot)

    async function performItemStackRequest(request, slot_data) {

        // console.log('request', request)
        // console.log('slot_data', slot_data)

        return await new Promise((resolve, reject) => {

            var timeoutID = setTimeout(() => {

                bot._client.off('item_stack_response', item_stack_response) //Remove listener
                reject('Timeout waiting for Item Stack Response')
            }, 5000)

            function item_stack_response(packet) {

                for (const response of packet.responses) {

                    if (response.request_id !== request.request_id) continue

                    clearTimeout(timeoutID) // Stop timer
                    bot._client.off('item_stack_response', item_stack_response) //Remove listener

                    if (response.status !== 'ok') {

                        console.log('FALED', packet)
                        reject('Item Stack Request Failed')
                        return
                    }

                    // console.log('response', response)

                    for (const container of response.containers) {

                        //TODO: Check for missing items in slot_data
                        for (const slot of container.slots) {

                            for (const p of slot_data) {

                                if (p.slot_type === container.slot_type && p.slot === slot.slot) {

                                    if (slot.count) {

                                        p.count = slot.count
                                        p.item.count = slot.count
                                        p.item.stack_id = slot.item_stack_id
                                        bot._client.emit('inventory_slot', p)
                                    } else {

                                        bot._client.emit('inventory_slot', {

                                            window_id: p.window_id,
                                            slot: p.slot,
                                            item: { network_id: 0 }
                                        })
                                    }
                                }
                            }
                        }
                    }

                    resolve(response)
                }
            }

            bot._client.on('item_stack_response', item_stack_response)
            bot._client.write('item_stack_request', { requests: [request] })
        })
    }

    return class Window extends Container {

        window_id
        window_type

        constructor(window_id, window_type, slots = []) {

            super(slots)
            this.window_id = window_id
            this.window_type = window_type
        }

        async moveItem(fromSlot, toSlot, toContainer) {

            const fromItem = this.slots[fromSlot]
            const toItem = (toContainer ?? this).slots[toSlot]

            assert.ok(fromItem?.type, 'fromSlot is empty')
            assert.ok(!toItem?.type, 'toSlot is not empty') //TODO: Stack?

            var slot_data = [
                {
                    window_id: toItem.window_id,
                    slot_type: toItem.slot_type,
                    slot: toItem.slot,
                    item: fromItem.networkItem
                },
                {
                    window_id: fromItem.window_id,
                    slot_type: fromItem.slot_type,
                    slot: fromItem.slot,
                    item: fromItem.networkItem
                }
            ]

            const request_id = -1
            const request = {
                request_id,
                actions: [{
                    type_id: 'place',
                    count: fromItem.networkItem.count,
                    source: { slot_type: fromItem.slot_type, slot: fromItem.slot, stack_id: fromItem.networkItem?.stack_id ?? 0 },
                    destination: { slot_type: toItem.slot_type, slot: toItem.slot, stack_id: toItem.networkItem?.stack_id ?? 0 },
                }],
                custom_names: [],
                cause: -1
            }

            await performItemStackRequest(request, slot_data)
        }

        async swapItems(fromSlot, toSlot, toContainer) {

            const fromItem = this.slots[fromSlot]
            const toItem = (toContainer ?? this).slots[toSlot]

            assert.ok(fromItem?.type, 'fromSlot is empty')
            assert.ok(toItem?.type, 'toSlot is empty')

            var slot_data = [
                {
                    window_id: toItem.window_id,
                    slot_type: toItem.slot_type,
                    slot: toItem.slot,
                    item: fromItem.networkItem
                },
                {
                    window_id: fromItem.window_id,
                    slot_type: fromItem.slot_type,
                    slot: fromItem.slot,
                    item: toItem.networkItem
                },
            ]

            const request_id = -1
            const request = {
                request_id,
                actions: [{
                    type_id: 'swap',
                    count: 0,
                    source: { slot_type: fromItem.slot_type, slot: fromItem.slot, stack_id: fromItem.networkItem?.stack_id ?? 0 },
                    destination: { slot_type: toItem.slot_type, slot: toItem.slot, stack_id: toItem.networkItem?.stack_id ?? 0 },
                }],
                custom_names: [],
                cause: -1
            }

            await performItemStackRequest(request, slot_data)
        }

        async destroyItem(fromSlot) {

            const fromItem = this.slots[fromSlot]

            console.log(fromItem)
            assert.ok(fromItem?.type, 'fromSlot is empty')
            // assert.ok(toItem?.type, 'toSlot is empty')

            var slot_data = [
                {
                    window_id: fromItem.window_id,
                    slot_type: fromItem.slot_type,
                    slot: fromItem.slot,
                    item: fromItem.networkItem
                }
            ]

            const request_id = -1
            const request = {
                request_id,
                actions: [{
                    type_id: 'destroy',
                    count: fromItem.networkItem.count,
                    source: { slot_type: fromItem.slot_type, slot: fromItem.slot, stack_id: fromItem.networkItem?.stack_id ?? 0 },
                    destination: undefined,
                }],
                custom_names: [],
                cause: -1
            }

            // console.log({ request, slot_data })

            await performItemStackRequest(request, slot_data)

        }
    }

}