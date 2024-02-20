// process.env.DEBUG = 'minecraft-protocol'
require('util').inspect.defaultOptions.depth = 10
process.on('warning', e => console.warn(e.stack))

const { once } = require('events')
const { Vec3 } = require('vec3')
const { pathfinder, goals: { GoalNearXZ, GoalInvert, GoalFollow } } = require('mineflayer-pathfinder')
const { createBot } = require('../lib/loader')

//-----------------------------------------------------------------------------------

const options = require('../credentials')
const bot = createBot(options)

bot.loadPlugin(pathfinder)

process.on('SIGINT', (signal) => bot.quit('Quit'))
bot.on('end', (reason) => { console.log(reason); setTimeout(() => process.exit(0), 200) })

//-----------------------------------------------------------------------------------

bot.once('spawn', async () => {

    bot.pathfinder.tickTimeout = 10
    bot.pathfinder.thinkTimeout = 10000 // ms
    bot.pathfinder.LOSWhenPlacingBlocks = false //bedrock
    bot.pathfinder.movements.placeCost = 3
    // bot.pathfinder.movements.scafoldingBlocks = [bot.registry.blocksByName['scaffolding'].id];

    var hasDirt = bot.inventory.items().find((item) => item.name === 'dirt')
    if (!hasDirt) {

        await bot.sendCommand(`/gamemode creative`)
        await bot.creative.setInventorySlot(8, 'dirt')
        await bot.sendCommand(`/gamemode survival`)
    }
    await bot.equip(bot.registry.itemsByName['dirt'].id)

    var following = null
    var busy = false
    setInterval(async () => {

        if (busy) return
        try {

            busy = true
            // Already following
            if (bot.players[following]) {

                const player = bot.players[following]
                const distance = bot.entity.position.distanceTo(player.entity.position)
                if (distance < 4.5) {

                    //await bot.lookAt(player.entity.position.offset(0, 1.6, 0))
                    // await bot.inventory2.drop('hotbar', 0, 1)
                    // bot.inventory2.print()
                }

            } else {

                // Find Player to follow
                for (const [username, player] of Object.entries(bot.players)) {

                    if (username === bot.username) continue
                    if (!player.entity?.position) continue

                    console.log('Following', username)
                    //const goal = new GoalFollow(player.entity, 4)
                    const goal = new GoalFollow(player.entity, 2)
                    bot.pathfinder.setGoal(goal, true)

                    following = username
                }
            }

        } finally {

            busy = false
        }
    }, 1000)
})

//-----------------------------------------------------------------------------------

async function sleep(ms) { await new Promise((resolve) => setTimeout(resolve, ms)) }