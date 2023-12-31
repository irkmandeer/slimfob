const { Vec3 } = require('vec3')
const { BEDROCK_PLAYER_OFFSET, vectorToFace } = require('../../conversions')

module.exports = (bot) => {

    bot.bedrock.activateBlock = activateBlock
    bot.bedrock.activateBlockWithOptions = activateBlockWithOptions

    //-----------------------------------------------------------------------------------
    // Activate Block (with options). Rename to clickBlock?
    //
    // The cursorPos, result position, etc logic in mineflayer for generic_place 
    // and activate block is different. The relay shows matching behaviour for generoc_place
    // when clicking on anything, eg opening chests, signs, placing blocks, etc.
    // Using generic place logic here so that this function can be used for placing also (top, bottom, delta, etc)
    async function activateBlockWithOptions(referenceBlock, options = {}) {

        const faceVector = options.faceVector ?? new Vec3(0, 1, 0) //direction

        // Look at the center of the face
        let dx = 0.5 + faceVector.x * 0.5
        let dy = 0.5 + faceVector.y * 0.5
        let dz = 0.5 + faceVector.z * 0.5

        if (dy === 0.5) { //Logic or slabs I assume
            if (options.half === 'top') dy += 0.25
            else if (options.half === 'bottom') dy -= 0.25
        }

        const cursorPos = options.cursorPos ?? (options.delta ?? new Vec3(dx, dy, dz))
        await bot.lookAt(referenceBlock.position.offset(cursorPos.x, cursorPos.y, cursorPos.z), options.forceLook)

        // All the needed values for the packets
        const face = vectorToFace(faceVector)
        const position = referenceBlock.position
        const result_position = position.plus(faceVector)
        const block_runtime_id = referenceBlock.stateId //TODO: Block.NetworkIdFromStateId(referenceBlock.stateId)
        const runtime_entity_id = bot._client.entityId
        const playerPos = bot.entity.position.offset(0, BEDROCK_PLAYER_OFFSET, 0)
        const hotbarSlot = bot.quickBarSlot
        const helditem = bot.heldItem?.networkItem ?? { network_id: 0 }

        // Start using item
        bot._client.write('player_action', {

            runtime_entity_id: runtime_entity_id,
            action: 'start_item_use_on',
            position: position,
            result_position: result_position,
            face: face
        })

        // Swing Arm
        bot._client.write('animate', {

            action_id: 'swing_arm',
            runtime_entity_id: runtime_entity_id,
            boat_rowing_time: undefined
        })

        // Inventory Transaction
        bot._client.write('inventory_transaction', {

            transaction: {
                legacy: { legacy_request_id: 0, legacy_transactions: undefined },
                transaction_type: 'item_use',
                actions: [],
                transaction_data: {
                    action_type: 'click_block',
                    block_position: position,
                    face: face,
                    hotbar_slot: hotbarSlot,
                    held_item: helditem,
                    player_pos: playerPos,
                    click_pos: cursorPos,
                    block_runtime_id: block_runtime_id
                }
            }
        })

        // Stop using item
        bot._client.write('player_action', {

            runtime_entity_id: runtime_entity_id,
            action: 'stop_item_use_on',
            position: position,
            result_position: { x: 0, y: 0, z: 0 },
            face: 0
        })

        return { position, result_position }
    }

    //-----------------------------------------------------------------------------------
    // Mineflayer compatible prototype

    async function activateBlock(block, direction, cursorPos) {

        await activateBlockWithOptions(block, {

            faceVector: direction ?? new Vec3(0, 1, 0),
            cursorPos: cursorPos ?? new Vec3(0.5, 0.5, 0.5)
        })
    }

    //-----------------------------------------------------------------------------------


}