const { EventEmitter } = require("events")

module.exports = (bot) => {

    return class Container extends EventEmitter {

        slots
        items() { return this.slots.filter((item) => item?.type ? true : false) }

        constructor(slots = []) {

            super()
            this.slots = slots
        }

        updateSlot(slot, newItem) {

            const oldItem = this.slots[slot] ?? null
            newItem.slot = Number(slot)
            this.slots[slot] = newItem

            this.emit('updateSlot', Number(slot), oldItem, newItem)
            this.emit(`updateSlot:${slot}`, oldItem, newItem)
        }

        firstEmptySlot() {

            for (const [index, item] of Object.entries(this.slots)) {

                if (!item?.type) return Number(index) //item.slot?
            }
            return null
        }

        print() {

            console.log('name:', this.name ?? '', 'window_type:', this.window_type, 'window_id:', this.window_id)
            var empty = true
            for (const item of this.items()) {

                empty = false
                const text = `${item.name} x ${item.count} (network_id: ${item.networkItem.network_id} stack_id: ${item.networkItem.stack_id}) block_runtime_id: ${item.networkItem.block_runtime_id})`
                console.log("".padEnd(2, " "), `${item.slot}.`, text)
            }
            if (empty) console.log('inventory.js', "".padEnd(2, " "), 'Nothing')
        }
    }

}