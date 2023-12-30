const assert = require('assert')
const { Vec3 } = require('vec3')
const { once } = require('events')

const QUICK_BAR_COUNT = 9
const QUICK_BAR_START = 36


module.exports = (bot) => {

    bot.equip = equip

    //-----------------------------------------------------------------------------------
    // This function needs some TLC, but good enough for now
    // TODO: destination, FindInventoryItem, firstEmptySlot

    async function equip(item, destination) {

        // Find item by ID
        if (typeof item === 'number') {

            item = bot.inventory.items().find((_item) => _item.type === item) ?? null
            assert(item !== null, 'Item not in inventory')
        }
        assert(item?.type, 'Invalid item')

        // If the item is currently being held, exit
        if (bot.quickBarSlot === item.slot) return

        // Destination (TODO)
        destination = destination ?? 'hand'
        assert(destination === 'hand', `equip destination ${destination} not implemented`)

        // Item in the quick bar?
        if (item.slot < QUICK_BAR_COUNT) {

            // Select the item
            bot.setQuickBarSlot(item.slot)
        }
        else {

            // First empty slot 
            var slot = (bot.inventory.slots.find((_item) => !(_item.type)) ?? null)?.slot ?? null

            // Open the inventory (if needed)
            const window = bot.currentWindow ? null : await bot.openInventory()
            assert(bot.currentWindow.window_type === 'inventory', 'Current window type is not inventory') // Close the current window if not?

            // Found empty slot and slot is in the hotbar
            if (slot !== null && slot < QUICK_BAR_COUNT) {

                await bot.inventory.moveItem(item.slot, slot)
            } else {

                //Otherwise, swap the current held item with the new item
                slot = bot.quickBarSlot
                await bot.inventory.swapItem(item.slot, slot)
            }

            // Close the inventory (if opened)
            if (window) await window.close()

            // Select the item
            bot.setQuickBarSlot(slot)
        }
    }
}