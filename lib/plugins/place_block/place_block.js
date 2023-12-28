const assert = require('assert')
const { Vec3 } = require('vec3')

module.exports = (bot) => {

    bot.placeBlock = placeBlock
    bot._placeBlockWithOptions = placeBlockWithOptions

    //-----------------------------------------------------------------------------------

    async function placeBlockWithOptions(referenceBlock, faceVector, options) {

        //TODO: - Latency makes placing multiple blocks very slow, waiting for inventory updates, but the inventory 
        //        needs updating before new blocks can be placed.
        //      - Vanilla behavour suggest the item count is updated internally, and the block immediately placed. If
        //        something is wrong, the block and inventory is reverted when updates are received.
        //      - Maybe also set the block, and update inventory? But that would mean removing block placed checks, which
        //        changes the behaviour drastically.
        //      - Meh, good enough for now

        // Exsiting block
        const result_position = referenceBlock.position.plus(faceVector) //dest
        const oldBlock = bot.blockAt(result_position)

        // Place block
        await bot._genericPlace(referenceBlock, { ...options, ...{ faceVector: faceVector } })

        //Checking if the block has changed is kinda pointless, since we still need to wait for the inventory updates.
        var newBlock = bot.blockAt(result_position)
        if (oldBlock.type !== newBlock.type) {

            console.log('Suprise!') //But that said I've never seen this happen
            return
        }

        //Block and inventory event listeners
        var receivedInventoryUpdate = false
        bot._client.once('player_hotbar', player_hotbar = () => { receivedInventoryUpdate = true })
        bot._client.once('inventory_slot', inventory_slot = () => { receivedInventoryUpdate = true }) //Should check for a specifc slot, not any update

        bot.on(`blockUpdate:${result_position}`, block_update = (_oldBlock, _newBlock) => {

            newBlock = _newBlock

            if (oldBlock.type !== newBlock.type) //We receive multiple updates 
                bot._client.off(`blockUpdate:${result_position}`, block_update)
        })

        // We won't be receiving inventory updates in creative mode
        const creative = bot.game.gameMode === 'creative'

        //Wait for updates - TODO: Don't use a loop
        const start_timeout = performance.now()
        while (newBlock.type === oldBlock.type || (!receivedInventoryUpdate && !creative)) { //stateId? helditem changed?

            await new Promise((resolve) => setTimeout(resolve, 20)) // horrible...
            if (performance.now() - start_timeout >= 5000) break // mineflayer 5s
        }

        // Turn off event listeners
        bot.off(`blockUpdate:${result_position}`, block_update)
        bot._client.off('player_hotbar', player_hotbar)
        bot._client.off('inventory_slot', inventory_slot)

        // Check new block
        assert(oldBlock?.type !== newBlock.type, `No block has been placed : the block ${newBlock?.name} is still ${oldBlock?.name}. Held ${bot.heldItem?.name}`)
    }

    //-----------------------------------------------------------------------------------

    async function placeBlock(referenceBlock, faceVector) {

        await placeBlockWithOptions(referenceBlock, faceVector ?? new Vec3(0, 1, 0), { swingArm: 'right' })
    }

    //-----------------------------------------------------------------------------------
}