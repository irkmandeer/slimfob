const assert = require('assert')
const { once } = require('events')

module.exports = (bot, ItemStackRequest) => {

    bot.creative = {
        clearInventory,
        // pickBlock,
        // setInventorySlot
    }

    //-----------------------------------------------------------------------------------



    //-----------------------------------------------------------------------------------

    // const creative_content = {}
    // bot._client.on('creative_content', (packet) => {

    //     for (item of bot._client.startGameData.itemstates) {

    //         if (item.runtime_id === 3) {

    //             console.log(item)
    //         }
    //     }

    //     for (item of packet.items) {

    //         assert.ok(!creative_content[item.entry_id])
    //         creative_content[item.entry_id] = item
    //     }
    // })


    // //-----------------------------------------------------------------------------------

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

    // //-----------------------------------------------------------------------------------

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

    // //-----------------------------------------------------------------------------------

    // async function setInventorySlot(slot, item, count = 64) {

    //     // console.log('setInventorySlot', slot, item, count)

    //     var request = new ItemStackRequest()

    //     if (bot.inventory.slots[slot]?.type) {

    //         current = bot.inventory.slots[slot].networkItem
    //         request.destroy('hotbar_and_inventory', slot, current.count)
    //     }

    //     if (item) { //null or undefined to clear

    //         request.craftCreative(item, 'hotbar_and_inventory', slot, count)
    //     }

    //     if (request.hasPendingRequests()) {

    //         var window = !bot.currentWindow ? await bot.openInventory() : null
    //         await request.send()
    //         if (window) await window.close()
    //     }
    // }

    //-----------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------

}