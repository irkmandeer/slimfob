// process.env.DEBUG = 'minecraft-protocol'
require('util').inspect.defaultOptions.depth = 10


const { pathfinder } = require('mineflayer-pathfinder')



const { createBot } = require('./lib/loader')

const auth = require('./credentials')
const options = {

    // version: '1.20.0',
    version: '1.20.50',

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


