const assert = require('assert')
const { EventEmitter } = require('events')
const { Vec3 } = require('vec3')
const { simplify } = require('prismarine-nbt')

module.exports = (bot) => {

    return class ItemStack {

        static equal(item1, item2) {

            return JSON.stringify(item1?.networkItem) === JSON.stringify(item2?.networkItem)
        }

        static fromNotch(networkItem) {

            var item = new ItemStack()
            item.type = networkItem.network_id ?? undefined
            item.name = undefined
            item.displayName = undefined
            item.stackSize = undefined
            item.count = networkItem.network_id ? (networkItem.count ?? 0) : undefined
            item.nbt = networkItem.extra?.nbt?.nbt ?? undefined
            item.networkItem = networkItem

            if (typeof item.nbt === 'object')
                item.nbt = simplify(item.nbt)

            if (bot.registry.items[networkItem.network_id]) {

                const registry_item = bot.registry.items[networkItem.network_id]

                item.name = registry_item.name
                item.displayName = registry_item.displayName
                item.stackSize = registry_item.stackSize
            }
            return item
        }
    }

}