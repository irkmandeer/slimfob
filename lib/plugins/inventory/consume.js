const { BEDROCK_PLAYER_OFFSET } = require('../../conversions')

const CONSUME_TIMEOUT = 2500

module.exports = (bot) => {

    bot.consume = consume

    //-----------------------------------------------------------------------------------
    function startComsuming() {

        const playerPos = bot.entity.position.offset(0, BEDROCK_PLAYER_OFFSET, 0)
        const hotbarSlot = bot.quickBarSlot
        const helditem = bot.heldItem?.networkItem ?? { network_id: 0 }

        // Send Item Use transaction
        const item_use = {

            transaction: {
                legacy: { legacy_request_id: 0, legacy_transactions: undefined },
                transaction_type: 'item_use',
                actions: [],
                transaction_data: {
                    action_type: 'click_air',
                    block_position: { x: 0, y: 0, z: 0 },
                    face: 255,
                    hotbar_slot: hotbarSlot,
                    held_item: helditem,
                    player_pos: playerPos,
                    click_pos: { x: 0, y: 0, z: 0 },
                    block_runtime_id: 0
                }
            },
        }

        console.log('inventory_transaction', item_use)
        bot._client.write('inventory_transaction', item_use)
    }

    //-----------------------------------------------------------------------------------

    function stopConsuming() {

        const playerPos = bot.entity.position.offset(0, BEDROCK_PLAYER_OFFSET, 0)
        const hotbarSlot = bot.quickBarSlot
        const helditem = bot.heldItem?.networkItem ?? { network_id: 0 }

        const item_release = {
            transaction: {
                legacy: { legacy_request_id: 0, legacy_transactions: undefined },
                transaction_type: 'item_release',
                actions: [],
                transaction_data: {
                    action_type: 'consume',
                    hotbar_slot: hotbarSlot,
                    held_item: helditem,
                    head_pos: playerPos
                }
            }
        }

        console.log('inventory_transaction', item_release)
        bot._client.write('inventory_transaction', item_release)
    }

    //-----------------------------------------------------------------------------------

    async function consume() {

        // You can consume food even if the hunger bar is full, or in creative. So I'm not doing any checks for that
        const creative = bot.game.gameMode === 'creative'

        // Send Item Use Transaction
        startComsuming()

        // Wait for completed_using_item and inventory update for CONSUME_TIMEOUT ms
        var stopped_consuming = false
        var completed_using_item = null
        var player_hotbar = null
        await Promise.race([

            Promise.all([
                new Promise((resolve) => {

                    bot._client.once('completed_using_item', completed_using_item = () => {

                        stopConsuming()
                        stopped_consuming = true

                        resolve()
                    })
                }),
                new Promise((resolve) => {

                    if (creative) {

                        resolve()
                    } else {

                        bot._client.once('player_hotbar', player_hotbar = () => resolve())
                    }
                })
            ]),
            new Promise((resolve, reject) => {

                setTimeout(() => {

                    if (player_hotbar) bot._client.off('player_hotbar', player_hotbar)
                    if (completed_using_item) bot._client.off('completed_using_item', completed_using_item)
                    if (!stopped_consuming) stopConsuming()

                    reject('Timeout')

                }, CONSUME_TIMEOUT)
            })
        ])
    }

    //-----------------------------------------------------------------------------------

}