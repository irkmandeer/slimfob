const assert = require('assert')
const { Vec3 } = require('vec3')
const { once } = require('events')
const { BEDROCK_PLAYER_OFFSET, vectorToFace, } = require('../../conversions')

module.exports = (bot) => {

    bot.targetDigBlock = null

    bot.lastDigTime = null //What is this used for?
    bot.dig = dig
    bot.stopDigging = () => { }
    // bot.canDigBlock = canDigBlock //TODO
    bot.digTime = digTime

    var diggingTask = null

    //-----------------------------------------------------------------------------------
    //TODO: update block state
    //TODO: checks for server auth breaking

    function digTime(block) {

        // Quick hack for getting the digtime in bedrock.
        // Digtime in server auth breaking is not that important since you can just wait for the block update then stop,
        // but it's a problem with client auth.
        // TODO: Tool, enchantments, boost, etc not working
        // @see https://github.com/PrismarineJS/mineflayer/blob/master/lib/plugins/digging.js
        let type = bot.heldItem?.type ?? null
        let enchantments = []

        if (!bot.entity.effects) bot.entity.effects = []

        const creative = bot.game.gameMode === 'creative'
        return block.digTime(
            type,
            creative,
            bot.entity.isInWater,
            !bot.entity.onGround,
            enchantments,
            bot.entity.effects
        )
    }

    //-----------------------------------------------------------------------------------

    async function dig(block, forceLook, digFace) {

        //TODO: Figure out how to handle async stopDigging.
        //      - Need to wait for abort_break to be sent by the next auth input packet before starting to dig again. 
        //      - But stopDigging is not async in mineflayer nor expected to be async in pathfinder.
        //      - IOW start_break will replace the abort_break when digging a new block and the auth input packet has not been sent.
        //      - I'm not really sure if this is a big issue. 
        if (bot.targetDigBlock) {

            bot.stopDigging()
            await once(bot, 'diggingAborted') // Seems like this solved the problem.
        }

        assert.ok(block?.position, 'dig was called with an undefined or null block')

        //TODO: Ignored lots of digface calculation logic here (ignore, raycast, function, auto, etc)

        // Look at the face, 
        const faceVector = digFace ?? new Vec3(0, 1, 0)
        const face = vectorToFace(faceVector)
        const position = block.position
        const runtime_entity_id = bot._client.entityId
        const creative = bot.game.gameMode === 'creative'
        const dig_time = digTime(block)

        let dx = 0.5 + faceVector.x * 0.5
        let dy = 0.5 + faceVector.y * 0.5
        let dz = 0.5 + faceVector.z * 0.5

        await bot.lookAt(block.position.offset(dx, dy, dz), forceLook)

        // Digging task
        diggingTask = { block }
        diggingTask.promise = new Promise((resolve, reject) => Object.assign(diggingTask, { resolve, reject }))

        bot.targetDigBlock = block

        // Swing arm animation
        bot._client.write('animate', {

            action_id: 'swing_arm',
            runtime_entity_id: runtime_entity_id,
            boat_rowing_time: undefined
        })

        const animationTimerID = setInterval(() => {

            bot._client.write('animate', {
                action_id: 'swing_arm',
                runtime_entity_id: runtime_entity_id,
                boat_rowing_time: undefined
            })

        }, 200) // Java uses 350, but relays shows 200ms        

        // Start Digging
        console.log('Digging Started. Dig time:', dig_time)
        const dig_time_start = performance.now()
        if (!dig_time) {

            console.log('------> start_break, predict_break')
            await bot.sendPlayerAuthInputTransaction({

                block_action: [
                    { action: 'start_break', position: position, face: face },
                    { action: 'predict_break', position: position, face: face },
                ]
            })

        } else {

            console.log('------> start_break')
            await bot.sendPlayerAuthInputTransaction({

                block_action: [
                    { action: 'start_break', position: position, face: face },
                    { action: 'predict_break', position: position, face: face }
                ]
            })
        }

        // Wait for digtime
        const waitTimeoutID = setTimeout(() => {

            clearTimeout(waitTimeoutID)
            clearTimeout(animationTimerID)

            //Send Predict Break
            console.log('------> predict_break')
            bot.sendPlayerAuthInputTransaction({

                block_action: [
                    { action: 'continue_break', position: position, face: face },
                    { action: 'predict_break', position: position, face: face },
                ]
            })

            bot.targetDigBlock = null
            bot.lastDigTime = performance.now()
            // bot._updateBlockState(block.position, 0)
        }, dig_time)

        // Add Block update listener
        bot.on(`blockUpdate:${position}`, onBlockUpdate = async (oldBlock, newBlock) => {


            if (newBlock?.type !== 0) return //is this safe?

            //Do we need a lock here?
            console.log('Digging Completed. Actual dig time:', performance.now() - dig_time_start)

            // Cleanup
            bot.off(`blockUpdate:${position}`, onBlockUpdate)
            clearTimeout(waitTimeoutID)
            clearTimeout(animationTimerID)
            bot.stopDigging = () => { }

            // Send abort break
            console.log('------> abort_break')

            await bot.sendPlayerAuthInputTransaction({

                // vanilla does something weird here, when aborting a dig, the face number is an
                // increasing value, seemingly linked to the amount of time spent digging, 
                // or maybe the progress? It appears to counts up to 100.
                // Using the wrong value, the cracking animation does not stop for other players.
                // Setting 0 seems to work ok

                block_action: [
                    { action: 'abort_break', position: position, face: 0 },
                ]
            })

            bot.targetDigBlock = null
            bot.lastDigTime = performance.now()
            bot.emit('diggingCompleted', newBlock)
            diggingTask.resolve()
        })

        // Inventory update event listeners
        var receivedInventoryUpdate = false
        bot._client.once('inventory_slot', inventory_slot = () => { receivedInventoryUpdate = true })
        bot._client.once('player_hotbar', player_hotbar = () => { receivedInventoryUpdate = true })

        // Assign Stop Digging method        
        bot.stopDigging = async () => {

            if (!bot.targetDigBlock) return

            // Cleanup
            clearTimeout(waitTimeoutID)
            clearTimeout(animationTimerID)
            bot.stopDigging = () => { }
            bot.off(`blockUpdate:${position}`, onBlockUpdate) //removeListener vs off ?
            bot._client.off('inventory_slot', inventory_slot)
            bot._client.off('player_hotbar', player_hotbar)

            // Send abort break
            await bot.sendPlayerAuthInputTransaction({

                block_action: [
                    { action: 'abort_break', position: position, face: 0 },
                ]
            })

            bot.targetDigBlock = null
            bot.lastDigTime = performance.now()
            bot.emit('diggingAborted', block)
            diggingTask.reject('Digging aborted')
        }

        //Wait for digging to complete
        await diggingTask.promise

        // If we are holding an item with durability, and we're not in creative, wait for inventory update
        // - I can't seem to determine when exactly to expect inventory updates. Different held items, switching tools,
        //   picking up items, etc changes the behaviour. So just giving them an extra bit of time, and hoping for the best.
        // - TODO: Remove the loop and use .then above
        if (!receivedInventoryUpdate && !creative && bot.heldItem?.hasDurability) {

            const inventory_wait_timeout_start = performance.now()
            while (!receivedInventoryUpdate && performance.now() - inventory_wait_timeout_start < 500) {

                await new Promise((resolve) => setTimeout(resolve, 10))
            }
        }

        bot._client.off('inventory_slot', inventory_slot)
        bot._client.off('player_hotbar', player_hotbar)
    }
}

