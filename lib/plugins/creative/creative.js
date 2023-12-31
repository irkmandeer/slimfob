const assert = require('assert')
const { once } = require('events')

module.exports = (bot, { ItemStackRequest }) => {

    bot.creative = {
        clearInventory,
        //pickBlock,
        setInventorySlot
    }

    //-----------------------------------------------------------------------------------
    // Creative content - TODO: Move to load_runtime_data
    const creative_content = {}
    bot._client.on('creative_content', (packet) => {

        for (item of packet.items) {

            assert.ok(!creative_content[item.entry_id])
            creative_content[item.entry_id] = item
        }
    })

    //-----------------------------------------------------------------------------------

    async function setInventorySlot(slot, itemType, count = 64) {

        console.log('setInventorySlot', slot, item, count)

        const toSlot = bot.inventory.slots[slot]

        // Destroy existing item
        var window = null
        if (bot.inventory.slots[slot]?.type) {

            // Open Inventory
            if (!bot.currentWindow) window = await bot.openInventory()

            // Destroy
            await bot.inventory.destroyItem(slot)
        }

        // Craft Creative
        if (itemType) {

            //TODO: Need a better way to match items that includes metadata, extra, etc
            if (typeof itemType === 'string') item = bot.registry.itemsByName[itemType]
            if (typeof itemType === 'number') item = bot.registry.items[itemType]
            assert.ok(typeof item === 'object', 'Invalid item type or name')

            // Get item in creative content (first match) - TODO: fix this (note above)
            const creative_item = Object.values(creative_content).find((e) => { return e.item.network_id === item.id })
            assert.ok(creative_item, 'Item not found in Creative Content')

            // Open Inventory
            if (!bot.currentWindow) window = await bot.openInventory()
 
            // Craft Creative
            const request = new ItemStackRequest()
            await request.craftCreative(toSlot, creative_item, item.stackSize ?? 64)
        }

        // Close
        if (window) await window.close()
    }

    //-----------------------------------------------------------------------------------

    async function clearInventory() {

        console.log('clearInventory')

        var window = null
        for (const item of bot.inventory.slots) {

            if (!item?.type) continue

            if (!bot.currentWindow) window = await bot.openInventory()
            await bot.inventory.destroyItem(item.slot)
        }

        if (window) await window.close()
    }

    //-----------------------------------------------------------------------------------

    // async function pickBlock(position) {

    //     const block_pick_request = {
    //         x: position.x,
    //         y: position.y,
    //         z: position.z,
    //         add_user_data: false,
    //         selected_slot: bot.quickBarSlot
    //     }

    //     await new Promise((resolve, reject) => {

    //         var received = 0
    //         function on_packet() {

    //             if (++received === 2) {

    //                 clearTimeout(timeoutID)
    //                 resolve()
    //             }
    //         }

    //         const timeoutID = setTimeout(() => {

    //             bot._client.off('gui_data_pick_item', on_packet)
    //             bot._client.off('player_hotbar', on_packet)
    //             reject('Timeout waiting for gui_data_pick_item')

    //         }, 5000)

    //         //Received packets: gui_data_pick_item, inventory_content player_hotbar
    //         bot._client.once('gui_data_pick_item', on_packet)
    //         bot._client.once('player_hotbar', on_packet)

    //         bot._client.write('block_pick_request', block_pick_request)
    //     })
    // }

    //-----------------------------------------------------------------------------------
}