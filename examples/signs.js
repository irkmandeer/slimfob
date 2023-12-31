// process.env.DEBUG = 'minecraft-protocol'
require('util').inspect.defaultOptions.depth = 10
process.on('warning', e => console.warn(e.stack))


const { once } = require('events')
const { Vec3 } = require('vec3')
const { pathfinder, goals: { GoalNearXZ, GoalInvert } } = require('mineflayer-pathfinder')
const { createBot } = require('../lib/loader')

const options = require('../credentials')
const bot = createBot(options)

bot.loadPlugin(pathfinder)

process.on('SIGINT', (signal) => bot.quit('Quit'))
bot.on('end', (reason) => { console.log(reason); setTimeout(() => process.exit(0), 200) })

bot.once('spawn', testPlaceSign)

async function testPlaceSign() {

    try {

        await bot.pathfinder.goto(new GoalNearXZ(-22, -8, 4.5))

        bot.setQuickBarSlot(0)

        if (bot.heldItem.name !== 'oak_sign') {

            await bot.chat('/gamemode creative')
            await bot.creative.setInventorySlot(0, 'oak_sign')
        }
        if (bot.game.gameMode !== 'survival') await bot.chat('/gamemode survival')


        var block = bot.blockAt(new Vec3(-22, -60, -8))
        if (block.name !== 'air') {

            await bot.dig(block)

            await sleep(1)
            for (const entity of Object.values(bot.entities).filter((e) => e.type === 'item')) {

                await bot.pathfinder.goto(new GoalNearXZ(entity.position.x, entity.position.z, 1))

            }
            await bot.pathfinder.goto(new GoalInvert(new GoalNearXZ(block.position.x, block.position.y, 2)))
        }

        var referenceBlock = bot.blockAt(block.position.offset(0, -1, 0))

       
        await bot.placeBlock(referenceBlock, new Vec3(0, 1, 0))

        //TODO: block_entity_data is not handles by world.js yet
        //TODO: Somehow need to wait for block_entity_data (maybe inside edit sign if no entity is set?)
        // Does not work, not closed yet await once(bot._client, 'block_entity_data')  
        await sleep(1000)

        await bot.updateSign(bot.blockAt(block.position), 'Front') //front
        await bot.updateSign(bot.blockAt(block.position), 'Back', true) //back

    } catch (error) {
        console.log(error)
    }

}


async function sleep(ms) { await new Promise((resolve) => setTimeout(resolve, ms)) }