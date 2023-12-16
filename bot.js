// process.env.DEBUG = 'minecraft-protocol'
require('util').inspect.defaultOptions.depth = 10

const { pathfinder } = require('mineflayer-pathfinder')
const { createBot } = require('./lib/loader')

const auth = require('./credentials')
const options = {
}
const bot = createBot({ ...auth, ...options })

bot.loadPlugin(pathfinder)

bot.on('end', (reason) => {
    console.log(reason)
    setTimeout(() => process.exit(0), 200)
})

process.on('SIGINT', (signal) => {

    console.log('(SIGINT)')
    bot.quit('Quit')
})

bot.on('blockUpdate', (oldBlock, newBlock) => {

    console.log('Block Updated:', { block: newBlock?.name, position: newBlock.position })
})

bot._client.on('spawn', (packet) => {

    // console.log('spawn', bot.entity, bot.username)
    console.log('Spawn', bot.entity.position)

})

bot.on('playerJoined', (player) => {

    console.log(player.username, 'joined the game.', player.entity?.position)
})


bot.on('playerLeft', (player) => {

    console.log(player.username, 'left the game.', player.entity?.position)
})

bot.on('entitySpawn', (entity) => {

    console.log('entitySpawn', entity.type, entity.username ?? entity.name)
})


bot.on('entityGone', (entity) => {

    console.log('entityGone', entity.type, entity.username ?? entity.name)
})

bot._client.on('move_player', (packet) => {

    if (packet.runtime_id === bot._client.entityId) {

        console.log('move_player', packet, bot._client.entityId)
    }
})