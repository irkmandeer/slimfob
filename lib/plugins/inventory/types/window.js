
const assert = require('assert')

module.exports = (bot, { ItemStackRequest }) => {

    const Container = require('./container')(bot)

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

            const request = new ItemStackRequest()
            await request.place(fromItem, toItem)
        }

        async swapItems(fromSlot, toSlot, toContainer) {

            const fromItem = this.slots[fromSlot]
            const toItem = (toContainer ?? this).slots[toSlot]

            assert.ok(fromItem?.type, 'fromSlot is empty')
            assert.ok(toItem?.type, 'toSlot is empty')

            const request = new ItemStackRequest()
            await request.swap(fromItem, toItem)
        }

        async destroyItem(fromSlot) {

            const fromItem = this.slots[fromSlot]
            
            assert.ok(fromItem?.type, 'fromSlot is empty')

            const request = new ItemStackRequest()
            await request.destroy(fromItem)
        }
    }

}