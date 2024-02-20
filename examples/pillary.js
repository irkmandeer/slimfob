// -40, -90

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

    await bot.sendCommand(`/gamemode creative`)
    await bot.creative.setInventorySlot(8, 'dirt')

    await bot.pathfinder.goto(new GoalNearXZ(-40, -90, 0.5))

    bot.setControlState('jump', false)
    while (!bot.entity.onGround) await bot.waitForTicks(1)

    bot.setControlState('sneak', true)
    await sleep(20 * 7)
    bot.setControlState('sneak', false)

    while (bot.entity.position.y > -60) {

        var block = bot.blockAt(bot.entity.position.offset(0, -0.5, 0))
        await bot.dig(block)
        while (bot.entity.onGround) await bot.waitForTicks(1)
        while (!bot.entity.onGround) await bot.waitForTicks(1)
    }

    while (bot.heldItem?.name === 'dirt' && bot.entity.position.y < -50) {

        var block = bot.blockAt(bot.entity.position.offset(0, -0.5, 0))

        console.log({ block: block.name })

        while (!bot.entity.onGround) await bot.waitForTicks(1)
        bot.setControlState('jump', true)
        bot.setControlState('sneak', false)

        while (bot.entity.onGround) await bot.waitForTicks(1)
        bot.setControlState('jump', false)

        await sleep(20 * 7)

        try {

            await bot.placeBlock(block, new Vec3(0, 1, 0))
        } catch (err) {

            console.log('ERROR:', err.message)
        }

   
        //        break
    }

    while (bot.entity.position.y > -60) {

        var block = bot.blockAt(bot.entity.position.offset(0, -0.5, 0))
        await bot.dig(block)
        while (bot.entity.onGround) await bot.waitForTicks(1)
        while (!bot.entity.onGround) await bot.waitForTicks(1)
    }

    bot.entity.pitch = 0

})

//-----------------------------------------------------------------------------------

async function sleep(ms) { await new Promise((resolve) => setTimeout(resolve, ms)) }