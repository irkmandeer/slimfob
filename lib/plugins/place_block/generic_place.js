const assert = require('assert')
const { Vec3 } = require('vec3')

const { BEDROCK_PLAYER_OFFSET, vectorToFace, } = require('../../conversions')

module.exports = (bot) => {

    bot._genericPlace = _genericPlace

    //-----------------------------------------------------------------------------------

    // TODO: Blocks are hashes
    // const Block = require('prismarine-block')(bot.registry) 

    //-----------------------------------------------------------------------------------
    //TODO Update htis function to use activateBlock
    
    async function _genericPlace(referenceBlock, options = {}) {

        assert.ok(bot.heldItem?.type, 'Must be holding an item to place')

        // This function has neen stripped of most logic, maybe change to function prototype to be compatible (direction)?
        const faceVector = options.faceVector ?? new Vec3(0, 1, 0) //direction. 

        // Look at the center of the face
        let dx = 0.5 + faceVector.x * 0.5
        let dy = 0.5 + faceVector.y * 0.5
        let dz = 0.5 + faceVector.z * 0.5

        if (dy === 0.5) {
            if (options.half === 'top') dy += 0.25
            else if (options.half === 'bottom') dy -= 0.25
        }

        const cursorPos = options.cursorPos ?? (options.delta ?? new Vec3(dx, dy, dz))  //original code uses options.delta, not sure for what

        // Look
        await bot.lookAt(referenceBlock.position.offset(cursorPos.x, cursorPos.y, cursorPos.z), options.forceLook)

        // Prepare needed 
        const face = vectorToFace(faceVector)
        const position = referenceBlock.position
        const result_position = position.plus(faceVector)

        //const block_runtime_id = Block.NetworkIdFromStateId(referenceBlock.stateId)
        const block_runtime_id = referenceBlock.stateId

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

        // What is this postion result used for?
        return position
    }

    //-----------------------------------------------------------------------------------
}