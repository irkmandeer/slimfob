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

    // if (oldBlock?.name !== newBlock?.name)
    //     console.log('[update_block]', oldBlock?.name, '>>', newBlock?.name, newBlock.position.toString())
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


// bot.once('spawn', () => { bot.physicsEnabled = false })
bot.once('spawn', debugFollowPlayer)
//bot.once('spawn', debugLookAtPlayer)
//bot.once('spawn', debugConsume)

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