// process.env.DEBUG = 'minecraft-protocol'
require('util').inspect.defaultOptions.depth = 10
process.on('warning', e => console.warn(e.stack))


const { once } = require('events')

const assert = require('assert')
const { Vec3 } = require('vec3')
const { pathfinder, Movements, goals: { GoalCompositeAll, GoalFollow, GoalPlaceBlock, GoalLookAtBlock, GoalBreakBlock, GoalGetToBlock, GoalY, GoalNear, GoalNearXZ, GoalInvert } } = require('mineflayer-pathfinder')
const { OctahedronIterator, SpiralIterator2d } = require('prismarine-world').iterators
const { createBot } = require('./lib/loader')

const auth = require('./credentials')
const options = {
    //host: '127.0.0.1',
    // host: '192.168.0.22',
    // version: '1.20.50',
    //port: 52331
    //port: 52770,
    // port: 54141,
    // skipPing: true
}
const bot = createBot({ ...auth, ...options })

bot.loadPlugin(pathfinder)

bot.on('end', (reason) => {
    console.log({ reason })
    setTimeout(() => process.exit(0), 200)
})

process.on('SIGINT', (signal) => {

    console.log('(SIGINT)')
    bot.quit('Quit')
})

bot.on('spawn', () => console.log('[spawn] Player Spawned'))
bot.on('death', () => console.log('[death] Player Died'))
bot.on('health', () => console.log('[health] health:', bot.health, 'food:', bot.food, 'saturation:', bot.foodSaturation))
bot.on('game', () => console.log('[game] mode:', bot.game.gameMode, 'dimension:', bot.game.dimension, 'difficulty:', bot.game.difficulty))

bot.on('blockUpdate', (oldBlock, newBlock) => {

    if (oldBlock?.name !== newBlock?.name)
        console.log('[update_block]', oldBlock?.name, '>>', newBlock?.name, newBlock.position.toString())
})


var lastRequestId = -1
function nextItemStackRequestId() {

    lastRequestId -= 2
    return lastRequestId
}

bot.on('inventoryItemChanged', (oldItem, newItem) => {

    console.log(
        'Inventory:',
        oldItem?.type ? `${oldItem?.name} x ${oldItem?.count} (slot_type: ${oldItem?.slot_type} network_id: ${oldItem?.networkItem.network_id} stack_id: ${oldItem?.networkItem.stack_id})` : '(none)',
        '=>',
        newItem?.type ? `${newItem.name} x ${newItem.count} (slot_type: ${oldItem?.slot_type} network_id: ${newItem.networkItem.network_id} stack_id: ${newItem.networkItem.stack_id})` : '(none)',
    )
})


bot.once('spawn', () => { bot.physicsEnabled = false })
//bot.once('spawn', debugFollowPlayer)
//bot.once('spawn', debugLookAtPlayer)
//bot.once('spawn', debugConsume)

// bot.once('spawn', debugCreative)

async function debugCreative() {

    // await bot.chat('/gamemode survival')
    // await bot.chat('/gamemode creative')

    bot.setQuickBarSlot(1)
    //await bot.creative.setInventorySlot(7, 'grass')
    await bot.creative.setInventorySlot(7, 'diamond_sword', 1)

    // await forceReloadInventory()
    await sleep(2000)
    bot.setQuickBarSlot(7)
}


async function debugConsume() {

    // await bot.chat('/gamemode survival')
    await bot.chat('/gamemode creative')

    if (!bot.inventory.items().find((_item) => _item.type === bot.registry.itemsByName.bread.id)) {

        await bot.chat('/give @a bread')
    }

    // await bot.creative.clearInventory()

    const window = await bot.openInventory()
    //await window.moveItem(0, 23)
    await window.swapItems(0, 1)
    await window.close()

    await sleep(1000)

    // //await bot.creative.setInventorySlot(0, bot.registry.itemsByName.dirt)
    // await bot.creative.setInventorySlot(0, 'dirt')
    // bot.inventory.print()

    bot.setQuickBarSlot(7)
    await bot.equip(bot.registry.itemsByName.bread.id)

    return
    try {

        await bot.consume()
        console.log('done')
    } catch (error) {
        console.log(error)
    }

}


bot._client.on('spawn', async (packet) => {

    //    bot.pathfinder.goto(new GoalFollow)
    //    bot.setControlState('jump', true)
    return
    if (bot.blockAt(new Vec3(-22, -60, -95))?.name === 'air') {

        bot.setQuickBarSlot(0)
        var referenceBlock = bot.blockAt(new Vec3(-22, -61, -95))
        await bot.placeBlock(referenceBlock, new Vec3(0, 1, 0))
    }

    bot.setQuickBarSlot(1)
    var block = bot.blockAt(new Vec3(-22, -60, -95))

    async function testStopDigging() {

        try {


            await bot.dig(block)

        } catch (error) {
            console.log(error)
        }
    }

    bot.setQuickBarSlot(0)
    testStopDigging()
    await new Promise((resolve) => setTimeout(resolve, 2000))
    //await bot.stopDigging()

    testStopDigging()
    await new Promise((resolve) => setTimeout(resolve, 1000))

    bot.setQuickBarSlot(1)
    await bot.dig(block)

    // //  bot.inventory.print()
    // //  return
    // // console.log({ heldItem: bot.heldItem })


    // // console.log(bot._container_data['inventory'])
    // // bot.inventory.print()

    // const chest = bot.blockAt(new Vec3(-21, -60, -92))

    // // console.log(chest)

    // // return

    // try {

    //     const window = await bot.openContainer(chest)
    //     //const window = await bot.openInventory()


    //     //console.log({heldItem: bot.heldItem})
    //     //await bot.activateBlock(chest)
    //     try {

    //         //console.log(chest)
    //         //console.log(window)

    //         // window.print()
    //         // console.log(window.items())

    //         //     // window.swap = swap
    //         // await window.swapItems(0, 0, bot.inventory)
    //         //     //await window.swap(1, 2)


    //         console.log('-----------------------------------------------------------')
    //         console.log('Before to Inventory')
    //         console.log('-----------------------------------------------------------')
    //         window.print()
    //         for (const item of window.items()) {

    //             const toSlot = bot.inventory.firstEmptySlot()
    //             if (toSlot === null) break

    //             await window.moveItem(item.slot, toSlot, bot.inventory)
    //         }

    //         console.log('-----------------------------------------------------------')
    //         console.log('Before to Window')
    //         console.log('-----------------------------------------------------------')
    //         window.print()
    //         for (const item of bot.inventory.items()) {

    //             const toSlot = window.firstEmptySlot()
    //             if (toSlot === null) break

    //             await bot.inventory.moveItem(item.slot, toSlot, window)
    //         }

    //         console.log('-----------------------------------------------------------')
    //         console.log('Done')
    //         console.log('-----------------------------------------------------------')            
    //         window.print()

    //         // console.log({firstEmptySlot: bot.inventory.firstEmptySlot()})

    //         // window.print()

    //         //     // const tx = new Proxy(window, new InventoryTransaction())
    //         //     // console.log(tx.swap)

    //         // } catch (error) {

    //         //     console.log(error)

    //     } finally {

    //         await window.close()
    //     }

    // } catch (error) {
    //     console.log(error)
    // }

    // // const window = await bot.openInventory()
    // // await window.close()

    // console.log('-----------------------------------------------------------')
    // console.log('Inventory')
    // console.log('-----------------------------------------------------------')       
    // bot.inventory.print()




    // // const window2 = await bot.openContainer(chest)
    // // try {
    // //     console.log(window2)

    // //     window2.print()

    // // } finally {

    // //     await window2.close()
    // // }


    // // await (await bot.openInventory()).close()

    // // // console.log('spawn', bot.entity, bot.username)
    // // console.log('Spawn', bot.entity.position)

    // // // bot._client.on('item_stack_response', item_stack_response = (packet) => {



    // // //     console.log(item_stack_response, packet)
    // // // })


    // // bot.inventory.print()
    // // bot.armor.print()
    // // bot.offhand.print()

    // // // console.log(bot.offhand.slots[0])


    // // const window = await bot.openInventory()
    // // try {



    // //     //console.log(bot.Compat.findItem)

    // //     // const item = bot.Compat.findItem.apply(bot.inventory, [/hoe/])
    // //     const item = bot.Compat.findItem.apply(bot.inventory, [/axe|hoe/])
    // //     await bot.equip(item)
    // //     //console.log(bot.Compat.findItem.apply(bot.inventory, [/hoe/]))

    // //     //   


    // //     // await bot.equip(null, 'off-hand')
    // //     // await forceReloadInventory()
    // //     // await bot.equip(null, 'off-hand')
    // //     // await forceReloadInventory()

    // //     const offhand = bot.Compat.findItem.apply(bot.inventory, [/shield|rocket/])

    // //     //await bot.equip(null, 'off-hand')
    // //     // await forceReloadInventory()
    // //     //const offhand = bot.Compat.findItem.apply(bot.inventory, [/shield/])
    // //     //const offhand = bot.Compat.findItem.apply(bot.inventory, [/filled_map/])
    // //     //const offhand = bot.Compat.findItem.apply(bot.inventory, [/shell/]) //nautilus_shell
    // //     //const offhand = bot.Compat.findItem.apply(bot.inventory, [/firework_rocket/])
    // //     await bot.equip(offhand, 'off-hand')
    // //     await forceReloadInventory()

    // // } finally {

    // //     await window.close()
    // // }

    // // return
    // // await bot.openInventory()
    // // await debugUnequipShield()
    // // await forceReloadInventory()
    // // await debugEquipShield()
    // // await forceReloadInventory()





    // // return

    // // for (const item of bot.inventory.items()) {

    // //     if (item.name !== 'shield') continue


    // //     console.log({ item })

    // //     const request_id = nextItemStackRequestId()

    // //     const actions = [
    // //         {
    // //             type_id: 'place',
    // //             count: item.networkItem.count,
    // //             source: { slot_type: item.slot_type, slot: item.slot, stack_id: item.networkItem?.stack_id ?? 0 },
    // //             destination: { slot_type: 'offhand', slot: 1, stack_id: 0 },
    // //         }
    // //     ]

    // //     const item_stack_request = {
    // //         requests: [
    // //             {
    // //                 request_id: request_id,
    // //                 actions: actions,
    // //                 custom_names: [],
    // //                 cause: -1
    // //             }
    // //         ]
    // //     }

    // //     // await bot.openInventory()

    // //     console.log('item_stack_request', item_stack_request)
    // //     bot._client.write('item_stack_request', item_stack_request)

    // //     break
    // // }

})

bot.on('playerJoined', (player) => {

    console.log('*', player.username, 'joined the game.', player.entity?.position)
})


bot.on('playerLeft', (player) => {

    console.log('*', player.username, 'left the game.', player.entity?.position)
})

bot.on('entitySpawn', (entity) => {

    console.log('[entitySpawn]', entity.type, entity.username ?? entity.name)
})


bot.on('entityGone', (entity) => {

    console.log('[entityGone]', entity.type, entity.username ?? entity.name)
})


function debugFollowPlayer() {


    //bot.pathfinder.movements.allowFreeMotion = true

    var followingPlayer = null
    setInterval(() => {

        if (!bot.players[followingPlayer]) {

            for (const username in bot.players) {

                if (username === bot.username) continue
                if (!bot.players[username]?.entity?.position) continue

                const goal = new GoalFollow(bot.players[username].entity, 3)
                bot.pathfinder.setGoal(goal, true)
                followingPlayer = username
                break
            }
        }
    }, 1000)
}

function debugLookAtPlayer() {

    var followingPlayer = null

    bot.on('physicsTick', () => {

        if (bot.players[followingPlayer]) {

            bot.lookAt(bot.players[followingPlayer].entity.position.offset(0, 1.62, 0))

        } else {

            for (const username in bot.players) {

                if (username === bot.username) continue
                followingPlayer = username
                break
            }
        }
    })


}

async function debugEquipShield() {

    console.log('--------------------------------------------------------')
    console.log('debugEquipShield')
    console.log('--------------------------------------------------------')
    // console.log(bot.offhand.slots)

    if (bot.offhand.slots[1]?.type) return

    var fromItem = null
    for (const item of bot.inventory.items()) {

        if (item.name === 'shield') {
            fromItem = item
            break
        }
    }

    if (!fromItem) {

        console.log('Missing From Item')
        return
    }

    const request_id = nextItemStackRequestId()

    const actions = [
        {
            type_id: 'place',
            count: fromItem.networkItem.count,
            source: { slot_type: fromItem.slot_type, slot: fromItem.slot, stack_id: fromItem.networkItem?.stack_id ?? 0 },
            destination: { slot_type: 'offhand', slot: 1, stack_id: 0 },
        },
    ]

    const item_stack_request = {
        requests: [
            {
                request_id: request_id,
                actions: actions,
                custom_names: [],
                cause: -1
            }
        ]
    }
    //console.log('item_stack_request', item_stack_request)
    bot._client.write('item_stack_request', item_stack_request)

    const item_stack_response = await once(bot._client, 'item_stack_response')

    // console.log('item_stack_response', item_stack_response)

    //    console.log(bot.offhand.slots)
}


async function debugUnequipShield() {

    console.log('--------------------------------------------------------')
    console.log('debugUnequipShield')
    console.log('--------------------------------------------------------')

    // console.log(bot.offhand.slots)
    //console.log(bot._container_data['offhand'])
    if (!bot.offhand.slots[1]?.type) return

    const fromItem = bot.offhand.slots[1]

    var firstEmptySlot = null
    for (const [index, item] of Object.entries(bot.inventory.slots)) {

        if (item === null) {

            firstEmptySlot = Number(index)
            break
        }
    }

    const request_id = nextItemStackRequestId()

    const actions = [
        {
            type_id: 'place',
            count: fromItem.networkItem.count,
            source: { slot_type: fromItem.slot_type, slot: fromItem.slot, stack_id: fromItem.networkItem?.stack_id ?? 0 },
            destination: { slot_type: 'hotbar_and_inventory', slot: firstEmptySlot, stack_id: 0 },
            //destination: { slot_type: 'hotbar_and_inventory', slot: firstEmptySlot, stack_id: fromItem.networkItem?.stack_id ?? 0 },
        }
    ]

    const item_stack_request = {
        requests: [
            {
                request_id: request_id,
                actions: actions,
                custom_names: [],
                cause: -1
            }
        ]
    }

    // await bot.openInventory()

    // console.log('item_stack_request', item_stack_request)
    bot._client.write('item_stack_request', item_stack_request)

    const item_stack_response = await once(bot._client, 'item_stack_response')

    //   console.log('item_stack_response', item_stack_response)

    //    console.log(bot.offhand.slots)
}








async function forceReloadInventory() {

    const inventory_transaction = {
        transaction: {
            legacy: { legacy_request_id: 0, legacy_transactions: undefined },
            transaction_type: 'item_use',
            actions: [],
            transaction_data: {
                //action_type: 'click_block',
                action_type: 'click_air',
                block_position: { x: 0, y: 0, z: 0 },
                face: 0,
                hotbar_slot: 99,
                held_item: { network_id: 0 },
                player_pos: { x: 0, y: 0, z: 0 },
                click_pos: { x: 0, y: 0, z: 0 },
                block_runtime_id: 0
            }
        }
    }

    // console.log('inventory_transaction', inventory_transaction)
    bot._client.write('inventory_transaction', inventory_transaction)

    await once(bot._client, 'player_hotbar')

    // bot._client.write('inventory_transaction', inventory_transaction)
}

async function sleep(ms) { await new Promise((resolve) => setTimeout(resolve, ms)) }